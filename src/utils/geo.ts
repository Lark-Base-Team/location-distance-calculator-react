import { Toast } from "@douyinfe/semi-ui"; // 可选，如果要在 utils 中提示
import {
  GaodeApiBaseResponse,
  GaodeGeocodingV3Response,
  GaodeDistanceV3Response,
  GaodeDrivingV5Response,
  GaodeWalkingV5Response,
  GaodeBicyclingV5Response,
  GaodeTransitV5Response,
  TravelMode,
} from "../types/gaode";

// 高德 API Key (替换为你自己的 Key，或者从配置/环境变量读取)
// ！！！注意：直接硬编码 Key 在代码中存在安全风险，仅作示例！！！
const DEFAULT_API_KEY = "6e1abfcb4d7681ab33ec051c0a25dfda"; // 从原项目获取的示例 Key

// 定义返回结果的类型
export interface CalculateDistanceResult {
  distance: number | null; // 公里
  duration: number | null; // 分钟
}

// --- Helper function to get citycode from city name using V3 Geocoding API ---
async function getCitycodeFromCityName(
  cityName: string,
  apiKey: string
): Promise<string | null> {
  if (!cityName || cityName.trim() === "") {
    console.error("[getCitycode] Invalid city name provided:", cityName);
    return null;
  }
  // Simple cache to avoid repeated lookups for the same city in one run
  if (
    getCitycodeFromCityName.cache &&
    getCitycodeFromCityName.cache[cityName]
  ) {
    return getCitycodeFromCityName.cache[cityName];
  }

  const url = `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(
    cityName
  )}&key=${apiKey}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = (await response.json()) as GaodeGeocodingV3Response;

    if (data.status === "1" && data.geocodes && data.geocodes.length > 0) {
      // --- Extract citycode instead of adcode ---
      const citycode = data.geocodes[0].citycode;
      if (typeof citycode === "string" && citycode.trim() !== "") {
        if (!getCitycodeFromCityName.cache) {
          getCitycodeFromCityName.cache = {};
        }
        getCitycodeFromCityName.cache[cityName] = citycode; // Cache the result
        return citycode;
      } else {
        // Handle cases where citycode might be empty or not a string (though unlikely for city level query)
        console.error(
          `[getCitycode] Invalid or empty citycode received for "${cityName}":`,
          citycode
        );
        // Fallback or specific error handling might be needed here
        // Try returning adcode as a fallback? Or just null?
        // Let's return null for now to stick to the citycode hypothesis.
        return null;
      }
      // --- End extraction change ---
    } else {
      console.error(
        `[getCitycode] Failed to get geocoding result for "${cityName}". API Info: ${
          data.info || "Unknown error"
        } (infocode: ${data.infocode})`
      );
      return null;
    }
  } catch (error) {
    console.error(
      `[getCitycode] Error fetching citycode for "${cityName}":`,
      error
    );
    return null;
  }
}
// Declare cache property on the function
declare global {
  interface Function {
    cache?: { [key: string]: string };
  }
}

/**
 * 使用高德地图 API 计算两点间的距离和时间
 * @param origin 起点经纬度 (格式："经度,纬度")
 * @param destination 终点经纬度 (格式："经度,纬度")
 * @param originCity 起点城市名 (公交模式需要)
 * @param destinationCity 终点城市名 (公交模式需要)
 * @param mode 出行模式 ('direct' | 'driving' | 'walking' | 'bicycling' | 'transit')
 * @param apiKey 高德 Web 服务 API Key
 * @param strategy 驾车策略 (可选, 仅驾车模式)
 * @returns Promise<CalculateDistanceResult>
 * @throws Error 如果 API 调用失败或返回错误
 */
export async function calculateDistance(
  origin: string,
  destination: string,
  originCity: string | undefined, // 允许 undefined
  destinationCity: string | undefined, // 允许 undefined
  mode: TravelMode,
  apiKey: string = DEFAULT_API_KEY, // 默认使用内置 Key
  strategy?: string // 设为可选
): Promise<CalculateDistanceResult> {
  // --- Log input parameters ---
  // console.debug(`calculateDistance called with:
  // origin: "${origin}"
  // destination: "${destination}"
  // originCity: "${originCity}"
  // destinationCity: "${destinationCity}"
  // mode: "${mode}"
  // strategy: "${strategy}"
  // apiKey: "${apiKey ? apiKey.substring(0, 5) + "..." : "N/A"}"`);
  // --- End log ---

  let url: string;
  // Ensure keyParam doesn't duplicate "key=" if apiKey already contains it
  const keyParam = apiKey.toLowerCase().startsWith("key=")
    ? apiKey
    : `key=${apiKey}`;

  // 根据不同的出行方式选择不同的API
  switch (mode) {
    case "direct": // 直线距离 v3
      url = `https://restapi.amap.com/v3/distance?type=0&origins=${origin}&destination=${destination}&${keyParam}`;
      break;
    case "driving": // 驾车路径规划 v5
      url = `https://restapi.amap.com/v5/direction/driving?origin=${origin}&destination=${destination}&${keyParam}&show_fields=cost`;
      if (strategy) {
        url += `&strategy=${strategy}`;
      }
      break;
    case "walking": // 步行路径规划 v5 (Updated)
      // url = `https://restapi.amap.com/v3/distance?type=3&origins=${origin}&destination=${destination}&${keyParam}`;
      url = `https://restapi.amap.com/v5/direction/walking?origin=${origin}&destination=${destination}&${keyParam}&show_fields=cost`; // Updated URL to V5 and added show_fields
      break;
    case "bicycling": // 骑行路径规划 v5 (Updated)
      // url = `https://restapi.amap.com/v4/direction/bicycling?origin=${origin}&destination=${destination}&${keyParam}`;
      url = `https://restapi.amap.com/v5/direction/bicycling?origin=${origin}&destination=${destination}&${keyParam}&show_fields=cost`; // Updated URL to V5 and added show_fields
      break;
    case "transit": // 公交路径规划 v5 (Updated)
      // Improved check: Ensure city names are not null, undefined, or empty strings
      if (
        !originCity ||
        originCity.trim() === "" ||
        !destinationCity ||
        destinationCity.trim() === ""
      ) {
        // Include the actual city names in the error for better debugging
        throw new Error(
          `公交模式需要有效的起点和终点城市名称。实际获取到的起点城市: "${originCity}", 终点城市: "${destinationCity}"`
        );
      }
      // url = `https://restapi.amap.com/v3/direction/transit/integrated?origin=${origin}&destination=${destination}&city=${encodeURIComponent(
      //  originCity
      // )}&cityd=${encodeURIComponent(destinationCity)}&${keyParam}`;
      // ---- Start Manual URL Construction with Logging ----
      const baseUrl_transit =
        "https://restapi.amap.com/v5/direction/transit/integrated";
      const params_transit = [];
      params_transit.push(`origin=${origin}`);
      // console.log("[Transit URL Step 1] Added origin:", params_transit.join("&"));
      params_transit.push(`destination=${destination}`);
      // console.log("[Transit URL Step 2] Added destination:", params_transit.join("&"));

      // --- Get citycodes for cities --- // UPDATED STEP
      // console.debug("[Transit Citycode] Attempting to fetch citycodes...");
      let originCitycode: string | null = null;
      let destinationCitycode: string | null = null;

      try {
        // Use Promise.all to fetch citycodes concurrently
        [originCitycode, destinationCitycode] = await Promise.all([
          getCitycodeFromCityName(originCity, apiKey),
          getCitycodeFromCityName(destinationCity, apiKey),
        ]);
      } catch (fetchError) {
        console.error(
          "[Transit Citycode] Error during Promise.all for citycode fetching:",
          fetchError
        );
        throw new Error(
          `获取起点或终点城市的 Citycode 失败: ${
            fetchError instanceof Error
              ? fetchError.message
              : String(fetchError)
          }`
        );
      }

      // console.debug(`[Transit Citycode] Fetched citycodes: origin=${originCitycode}, destination=${destinationCitycode}`);

      if (!originCitycode || !destinationCitycode) {
        throw new Error(
          `无法获取有效的起点 (${originCity}) 或终点 (${destinationCity}) 的 Citycode。请检查城市名称是否准确无误或 V3 Geocoding API 是否返回了有效的 citycode。` // Updated error message
        );
      }
      // --- End Get citycodes --- //

      // Use citycodes instead of adcodes/names
      // AND use parameter names city1, city2 as per V5 Transit doc
      params_transit.push(`city1=${originCitycode}`); // Use city1
      params_transit.push(`city2=${destinationCitycode}`); // Use city2
      // console.log("[Transit URL Step 3] Added city1 (citycode):", params_transit.join("&")); // Optional log update
      // console.log("[Transit URL Step 4] Added city2 (citycode):", params_transit.join("&")); // Optional log update

      params_transit.push(keyParam); // keyParam should be "key=..."
      params_transit.push("show_fields=cost");
      if (strategy) {
        params_transit.push(`strategy=${strategy}`);
      }
      const joinedParams = params_transit.join("&"); // Join explicitly
      // console.debug("[Transit URL Joined] Joined params string (raw, using citycodes):", joinedParams.replace(apiKey, "key=***")); // Removed
      url = `${baseUrl_transit}?${joinedParams}`; // Assign joined string
      // console.debug("[Transit URL Final Raw] Final URL before fetch (using citycodes):", url.replace(apiKey, "key=***")); // Removed
      // ---- End Manual URL Construction ----

      // url = `https://restapi.amap.com/v5/direction/transit/integrated?origin=${origin}&destination=${destination}&city=${encodeURIComponent(
      //   originCity
      // )}&cityd=${encodeURIComponent(
      //   destinationCity
      // )}&${keyParam}&show_fields=cost`; // Updated URL to V5 and added show_fields
      // // TODO: Add transit strategy parameter when implemented in UI
      // // Use the passed strategy if mode is transit
      // if (strategy) {
      //   url += `&strategy=${strategy}`;
      // }
      break;
    default:
      throw new Error(`Unknown mode: ${mode}`);
  }

  // --- Log added for city name verification ---
  if (mode === "transit") {
    // console.debug(`[Transit City Check] Raw cities before encoding: originCity="${originCity}", destinationCity="${destinationCity}"`);
  }
  // --- End log ---

  // console.debug("Requesting API (raw URL):", url); // Removed

  try {
    // Log the URL again immediately before fetch
    // console.debug("URL passed to fetch:", url); // Removed
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // 根据不同的模式，解析不同的响应数据
    let data: GaodeApiBaseResponse;
    let distance: number | null = null;
    let duration: number | null = null;

    // --- v3 Distance API (direct only) ---
    if (mode === "direct") {
      data = (await response.json()) as GaodeDistanceV3Response;
      // console.debug("API Response:", data);

      // Removed walking from this block
      if (
        data.status !== "1" ||
        !(data as GaodeDistanceV3Response).results ||
        (data as GaodeDistanceV3Response).results.length === 0
      ) {
        // status 为 0 也可能表示失败，info 会提供原因
        throw new Error(
          `高德 API (v3 Distance) 错误: ${data.info || "未知错误"} (infocode: ${
            data.infocode
          })` // Updated error message slightly
        );
      }
      distance = (data as GaodeDistanceV3Response).results[0].distance
        ? Number((data as GaodeDistanceV3Response).results[0].distance) / 1000
        : null;
      // V3 Distance API 'direct' (type=0) might not return duration, set to null
      duration = (data as GaodeDistanceV3Response).results[0].duration
        ? Number((data as GaodeDistanceV3Response).results[0].duration) / 60
        : null; // Keep duration parsing for now, maybe type=0 provides it?
    }
    // --- v5 Driving API ---
    else if (mode === "driving") {
      data = (await response.json()) as GaodeDrivingV5Response;
      // console.debug("API Response:", data);

      // v5版本status=1代表成功，但infocode=10000才代表成功
      if (data.status !== "1" || data.infocode !== "10000") {
        throw new Error(
          `高德 API (v5 Driving) 错误: ${data.info || "未知错误"} (infocode: ${
            data.infocode
          })`
        );
      }
      const drivingData = data as GaodeDrivingV5Response;
      if (
        drivingData.route &&
        drivingData.route.paths &&
        drivingData.route.paths.length > 0
      ) {
        const firstPath = drivingData.route.paths[0]; // Use variable for clarity
        distance = firstPath.distance
          ? Number(firstPath.distance) / 1000
          : null;
        // --- Start Duration Fix ---
        // Prioritize path.duration, fallback to cost.duration if needed (though less likely based on example)
        duration = firstPath.duration
          ? Number(firstPath.duration) / 60
          : firstPath.cost?.duration
          ? Number(firstPath.cost.duration) / 60
          : null;
        // --- End Duration Fix ---
      } else {
        // 即使 infocode 是 10000，也可能没有路径（例如无法到达）
        console.warn("驾车模式未返回有效路径数据");
        // 可以选择抛出错误或返回 null
        // throw new Error('驾车模式未返回有效路径数据');
      }
    }
    // --- v5 Walking API (New block) ---
    else if (mode === "walking") {
      data = (await response.json()) as GaodeWalkingV5Response;
      // console.debug("API Response:", data);

      if (data.status !== "1" || data.infocode !== "10000") {
        throw new Error(
          `高德 API (v5 Walking) 错误: ${data.info || "未知错误"} (infocode: ${
            data.infocode
          })`
        );
      }
      const walkingData = data as GaodeWalkingV5Response;
      if (
        walkingData.route &&
        walkingData.route.paths &&
        walkingData.route.paths.length > 0
      ) {
        const firstPath = walkingData.route.paths[0]; // Use variable
        distance = firstPath.distance
          ? Number(firstPath.distance) / 1000
          : null;
        // --- Start Duration Fix ---
        // Prioritize path.duration
        duration = firstPath.duration
          ? Number(firstPath.duration) / 60
          : firstPath.cost?.duration // Keep fallback just in case API varies
          ? Number(firstPath.cost.duration) / 60
          : null;
        // --- End Duration Fix ---
      } else {
        console.warn("步行模式未返回有效路径数据");
      }
    }
    // --- v5 Bicycling API (New block) ---
    else if (mode === "bicycling") {
      data = (await response.json()) as GaodeBicyclingV5Response;
      // console.debug("API Response:", data);

      // -- Start modification --
      // Check for specific non-critical error codes first
      if (data.status === "1" && data.infocode === "30007") {
        // RESULTS_ARE_EMPTY is not a critical failure, means no route found
        console.warn(
          `高德 API (v5 Bicycling) 提示: ${data.info} (infocode: ${data.infocode}) - 无骑行路径`
        );
        // Return nulls, don't throw error
      } else if (data.status !== "1" || data.infocode !== "10000") {
        // For other errors, throw
        throw new Error(
          `高德 API (v5 Bicycling) 错误: ${
            data.info || "未知错误"
          } (infocode: ${data.infocode})`
        );
      }
      // -- End modification --

      const bicyclingData = data as GaodeBicyclingV5Response;
      if (
        bicyclingData.route &&
        bicyclingData.route.paths &&
        bicyclingData.route.paths.length > 0
      ) {
        const firstPath = bicyclingData.route.paths[0]; // Use variable
        distance = firstPath.distance
          ? Number(firstPath.distance) / 1000
          : null;
        // --- Start Duration Fix ---
        // Prioritize path.duration
        duration = firstPath.duration
          ? Number(firstPath.duration) / 60
          : firstPath.cost?.duration // Keep fallback
          ? Number(firstPath.cost.duration) / 60
          : null;
        // --- End Duration Fix ---
      } else {
        console.warn("骑行模式未返回有效路径数据");
      }
    }
    // --- v5 Transit API --- (Updated to V5 parsing logic)
    else if (mode === "transit") {
      data = (await response.json()) as GaodeTransitV5Response;
      // console.debug("API Response:", data);

      if (data.status !== "1" || data.infocode !== "10000") {
        // Use V5 success check
        throw new Error(
          `高德 API (v5 Transit) 错误: ${data.info || "未知错误"} (infocode: ${
            data.infocode
          })` // Updated error message to V5
        );
      }
      const transitData = data as GaodeTransitV5Response;
      // Assuming V5 structure is similar to V3 for transits, but check docs if issues arise.
      if (
        transitData.route &&
        transitData.route.transits &&
        transitData.route.transits.length > 0
      ) {
        const firstTransit = transitData.route.transits[0];
        // 公交通常只关心总耗时
        // Try cost.duration first if available (from show_fields=cost)
        duration = firstTransit.cost?.duration
          ? Number(firstTransit.cost.duration) / 60
          : firstTransit.duration // Fallback check
          ? Number(firstTransit.duration) / 60
          : null;
        // V5 might provide distance differently... For now, keep it null...
        // distance = firstTransit.distance ? Number(firstTransit.distance) / 1000 : null; // 这行之前被注释掉了
        // --- Extract distance from transit object as per V5 doc --- // NEW
        distance = firstTransit.distance
          ? Number(firstTransit.distance) / 1000 // Convert meters to kilometers
          : null;
        // --- End distance extraction ---
      } else {
        console.warn("公交模式未返回有效路径数据");
      }
    }

    return { distance, duration };
  } catch (error) {
    console.error("Error calling Gaode API or processing result:", error);
    // 将原始错误或包装后的错误向上抛出
    if (error instanceof Error) {
      throw new Error(`API 请求失败: ${error.message}`);
    } else {
      throw new Error(`发生未知 API 请求错误: ${String(error)}`);
    }
  }
}

// 导出默认 API Key，方便在 App.tsx 中使用
export { DEFAULT_API_KEY };
