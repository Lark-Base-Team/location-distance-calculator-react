import { Toast } from "@douyinfe/semi-ui"; // 可选，如果要在 utils 中提示

// 高德 API Key (替换为你自己的 Key，或者从配置/环境变量读取)
// ！！！注意：直接硬编码 Key 在代码中存在安全风险，仅作示例！！！
const DEFAULT_API_KEY = "6e1abfcb4d7681ab33ec051c0a25dfda"; // 从原项目获取的示例 Key

// 定义返回结果的类型
export interface CalculateDistanceResult {
  distance: number | null; // 公里
  duration: number | null; // 分钟
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
  mode: string,
  apiKey: string = DEFAULT_API_KEY, // 默认使用内置 Key
  strategy?: string // 设为可选
): Promise<CalculateDistanceResult> {
  let url: string;
  const keyParam = `key=${apiKey}`;

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
    case "walking": // 步行路径规划 v3 (注意：文档中距离API type=1，但步行路径规划API是另一个)
      // 为了与原项目行为一致，继续使用 v3 distance API type=3 (步行)
      // url = `https://restapi.amap.com/v3/direction/walking?origin=${origin}&destination=${destination}&${keyParam}`;
      url = `https://restapi.amap.com/v3/distance?type=3&origins=${origin}&destination=${destination}&${keyParam}`;
      break;
    case "bicycling": // 骑行路径规划 v4
      url = `https://restapi.amap.com/v4/direction/bicycling?origin=${origin}&destination=${destination}&${keyParam}`;
      break;
    case "transit": // 公交路径规划 v3
      if (!originCity || !destinationCity) {
        throw new Error("公交模式需要提供起点和终点城市名称。");
      }
      url = `https://restapi.amap.com/v3/direction/transit/integrated?origin=${origin}&destination=${destination}&city=${encodeURIComponent(
        originCity
      )}&cityd=${encodeURIComponent(destinationCity)}&${keyParam}`;
      break;
    default:
      throw new Error(`Unknown mode: ${mode}`);
  }

  console.log("Requesting API:", url.replace(apiKey, "***")); // 打印 URL，隐藏 Key

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log("API Response:", data);

    let distance: number | null = null;
    let duration: number | null = null;

    // --- v3 Distance API (direct, walking) ---
    if (mode === "direct" || mode === "walking") {
      if (data.status !== "1" || !data.results || data.results.length === 0) {
        // status 为 0 也可能表示失败，info 会提供原因
        throw new Error(
          `高德 API (v3) 错误: ${data.info || "未知错误"} (infocode: ${
            data.infocode
          })`
        );
      }
      distance = data.results[0].distance
        ? Number(data.results[0].distance) / 1000
        : null;
      duration = data.results[0].duration
        ? Number(data.results[0].duration) / 60
        : null;
    }
    // --- v5 Driving API ---
    else if (mode === "driving") {
      // v5版本status=1代表成功，但infocode=10000才代表成功
      if (data.status !== "1" || data.infocode !== "10000") {
        throw new Error(
          `高德 API (v5 Driving) 错误: ${data.info || "未知错误"} (infocode: ${
            data.infocode
          })`
        );
      }
      if (data.route && data.route.paths && data.route.paths.length > 0) {
        distance = data.route.paths[0].distance
          ? Number(data.route.paths[0].distance) / 1000
          : null;
        duration = data.route.paths[0].cost?.duration
          ? Number(data.route.paths[0].cost.duration) / 60
          : null;
      } else {
        // 即使 infocode 是 10000，也可能没有路径（例如无法到达）
        console.warn("驾车模式未返回有效路径数据");
        // 可以选择抛出错误或返回 null
        // throw new Error('驾车模式未返回有效路径数据');
      }
    }
    // --- v4 Bicycling API ---
    else if (mode === "bicycling") {
      // v4版本 errcode=0 代表成功
      if (data.errcode !== 0) {
        throw new Error(
          `高德 API (v4 Bicycling) 错误: ${
            data.errdetail || data.errmsg || "未知错误"
          } (errcode: ${data.errcode})`
        );
      }
      if (data.data && data.data.paths && data.data.paths.length > 0) {
        distance = data.data.paths[0].distance
          ? Number(data.data.paths[0].distance) / 1000
          : null;
        duration = data.data.paths[0].duration
          ? Number(data.data.paths[0].duration) / 60
          : null;
      } else {
        console.warn("骑行模式未返回有效路径数据");
      }
    }
    // --- v3 Transit API ---
    else if (mode === "transit") {
      if (data.status !== "1" || data.infocode !== "10000") {
        throw new Error(
          `高德 API (v3 Transit) 错误: ${data.info || "未知错误"} (infocode: ${
            data.infocode
          })`
        );
      }
      if (data.route && data.route.transits && data.route.transits.length > 0) {
        // 公交通常只关心总耗时，距离可能包含步行距离等，根据需求调整
        // distance = data.route.transits[0].distance ? Number(data.route.transits[0].distance) / 1000 : null;
        duration = data.route.transits[0].duration
          ? Number(data.route.transits[0].duration) / 60
          : null;
        // 如果需要总距离，可以累加 segments 的 distance
        // distance = data.route.transits[0].segments.reduce((sum, seg) => sum + Number(seg.distance || 0), 0) / 1000;
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
