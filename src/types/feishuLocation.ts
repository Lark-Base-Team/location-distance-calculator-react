/**
 * 飞书地理位置字段相关类型定义
 */

/**
 * 飞书地理位置字段值
 */
export interface FeishuLocationField {
  location: string; // 地址文本，如"北京市海淀区"
  cityname?: string; // 城市名称，如"北京市"
  lat?: number; // 纬度
  lon?: number; // 经度
  address?: string; // 完整地址
  adname?: string; // 行政区域名称
  name?: string; // 地点名称
  pname?: string; // 省份名称
}

/**
 * 用于更新飞书记录的字段值结构
 */
export interface RecordUpdateFields {
  [fieldId: string]: number | string | boolean | null | undefined;
}

/**
 * 用于更新飞书记录的请求结构
 */
export interface RecordUpdate {
  recordId: string;
  fields: RecordUpdateFields;
}

/**
 * 用于验证有效的地理位置字段值
 * @param value 要验证的值
 * @returns 是否为有效的地理位置字段值
 */
export function isValidLocationField(
  value: unknown
): value is FeishuLocationField {
  return (
    value !== null &&
    typeof value === "object" &&
    "location" in value &&
    typeof (value as FeishuLocationField).location === "string"
  );
}

/**
 * 生成经纬度坐标字符串
 * @param field 飞书地理位置字段
 * @returns 经纬度字符串 "longitude,latitude" 或原始地址文本
 */
export function getCoordinateString(field: FeishuLocationField): string {
  if (field.lon !== undefined && field.lat !== undefined) {
    return `${field.lon},${field.lat}`;
  }
  return field.location;
}
