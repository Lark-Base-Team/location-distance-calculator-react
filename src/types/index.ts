/**
 * 类型定义导出索引文件
 */

// 导出高德API类型
export * from "./gaode";

// 导出飞书地理位置类型
export * from "./feishuLocation";

/**
 * 表示计算距离的模式
 */
export type DistanceMode =
  | "direct"
  | "driving"
  | "walking"
  | "bicycling"
  | "transit";
