/**
 * 高德地图API类型定义
 * 包含V3/V5 API响应类型和相关接口
 */

// =============== 通用类型 ===============

/**
 * 高德API常用响应状态
 */
export interface GaodeApiBaseResponse {
  status: string; // 高德API响应状态，"1"表示成功
  info: string; // 状态说明，当status不为1时，info会返回错误原因
  infocode: string; // 状态码，V5 API中10000表示成功
}

/**
 * 出行方式类型
 */
export type TravelMode =
  | "direct"
  | "driving"
  | "walking"
  | "bicycling"
  | "transit";

/**
 * 路径规划公共参数
 */
export interface RoutePathCost {
  duration: number; // 预计耗时，单位：秒
  duration_in_traffic?: number; // 考虑实时路况下的预计耗时，单位：秒
  toll_cost?: number; // 预计过路费，单位：元
  toll_distance?: number; // 收费里程，单位：米
  traffic_lights?: number; // 交通信号灯数量
}

/**
 * 路径规划通用路径信息
 */
export interface RoutePath {
  distance: number; // 距离，单位：米
  duration?: string; // 总耗时，单位：秒 (从V5响应观察到)
  cost?: RoutePathCost; // 所需时间和开销信息
}

// =============== V3 地理编码 API ===============

/**
 * V3 地理编码 API 响应
 */
export interface GaodeGeocodingV3Response extends GaodeApiBaseResponse {
  geocodes: Array<{
    formatted_address: string; // 结构化地址
    country: string; // 国家
    province: string; // 省份
    citycode: string; // 城市编码
    city: string; // 城市名称
    district: string; // 区县
    adcode: string; // 行政区编码
    location: string; // 坐标点（经度,纬度）
  }>;
  count: string; // 返回结果数目
}

// =============== V3 直线距离 API ===============

/**
 * V3 距离测量 API 响应
 */
export interface GaodeDistanceV3Response extends GaodeApiBaseResponse {
  results: Array<{
    origin_id: string; // 起点标识
    dest_id: string; // 终点标识
    distance: string; // 距离，单位：米
    duration?: string; // 时间，单位：秒
  }>;
}

// =============== V5 驾车路径规划 API ===============

/**
 * V5 驾车路径规划 API 响应
 */
export interface GaodeDrivingV5Response extends GaodeApiBaseResponse {
  route: {
    origin: string; // 起点坐标
    destination: string; // 终点坐标
    paths: Array<
      RoutePath & {
        steps: Array<{
          instruction: string; // 行驶指示
          orientation: string; // 方向
          road_name: string; // 道路名称
          step_distance: number; // 分段距离
          toll_road: boolean; // 是否收费道路
          toll_cost?: number; // 分段收费，单位：元
          // 其他驾车特有字段...
        }>;
        // 其他驾车路径特有字段...
      }
    >;
    // 其他驾车规划特有字段...
  };
  count: number; // 路径规划结果数目
}

// =============== V5 步行路径规划 API ===============

/**
 * V5 步行路径规划 API 响应
 */
export interface GaodeWalkingV5Response extends GaodeApiBaseResponse {
  route: {
    origin: string; // 起点坐标
    destination: string; // 终点坐标
    paths: Array<
      RoutePath & {
        steps: Array<{
          instruction: string; // 行走指示
          orientation: string; // 方向
          road_name: string; // 道路名称
          step_distance: number; // 分段距离
          // 其他步行特有字段...
        }>;
        // 其他步行路径特有字段...
      }
    >;
    // 其他步行规划特有字段...
  };
  count: number; // 路径规划结果数目
}

// =============== V5 骑行路径规划 API ===============

/**
 * V5 骑行路径规划 API 响应
 */
export interface GaodeBicyclingV5Response extends GaodeApiBaseResponse {
  route: {
    origin: string; // 起点坐标
    destination: string; // 终点坐标
    paths: Array<
      RoutePath & {
        steps: Array<{
          instruction: string; // 骑行指示
          orientation: string; // 方向
          road_name: string; // 道路名称
          step_distance: number; // 分段距离
          // 其他骑行特有字段...
        }>;
        // 其他骑行路径特有字段...
      }
    >;
    // 其他骑行规划特有字段...
  };
  count: number; // 路径规划结果数目
}

// =============== V5 公交路径规划 API ===============

/**
 * 公交线路信息
 */
export interface TransitLine {
  name: string; // 线路名称
  type: string; // 交通类型(公交、地铁等)
  id: string; // 线路ID
  distance: number; // 线路距离
  // 其他公交线路特有字段...
}

/**
 * 公交站点信息
 */
export interface TransitStop {
  name: string; // 站点名称
  id: string; // 站点ID
  location: string; // 站点坐标
  // 其他站点特有字段...
}

/**
 * 公交路段信息
 */
export interface TransitSegment {
  walking_distance: number; // 步行距离
  line?: TransitLine; // 乘坐的线路信息
  departure_stop?: TransitStop; // 上车站点
  arrival_stop?: TransitStop; // 下车站点
  vehicle_time?: number; // 乘坐时间
  // 其他公交路段特有字段...
}

/**
 * V5 公交路径规划 API 响应
 */
export interface GaodeTransitV5Response extends GaodeApiBaseResponse {
  route: {
    origin: string; // 起点坐标
    destination: string; // 终点坐标
    transits: Array<{
      cost: {
        duration: number; // 预计耗时，单位：秒
        // 其他成本信息...
      };
      distance: number; // 总距离，单位：米
      duration?: number; // 总耗时，单位：秒（旧版兼容）
      segments: TransitSegment[]; // 路段信息
      // 其他公交路径特有字段...
    }>;
    // 其他公交规划特有字段...
  };
  count: number; // 路径规划结果数目
}
