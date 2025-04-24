# 类型系统说明

本项目使用 TypeScript 类型系统来提高代码的健壮性和可维护性。主要包含以下类型定义文件：

## 目录结构

```
src/types/
├── index.ts          # 导出所有类型的入口文件
├── gaode.ts          # 高德地图API相关类型定义
├── feishuLocation.ts # 飞书地理位置字段相关类型定义
└── README.md         # 本文档
```

## 主要类型定义

### 高德 API 类型 (gaode.ts)

- `GaodeApiBaseResponse`: 高德 API 基础响应结构
- `TravelMode`: 出行方式类型 ('direct' | 'driving' | 'walking' | 'bicycling' | 'transit')
- `GaodeGeocodingV3Response`: 高德 V3 地理编码 API 响应类型
- `GaodeDistanceV3Response`: 高德 V3 直线距离 API 响应类型
- `GaodeDrivingV5Response`: 高德 V5 驾车路径规划 API 响应类型
- `GaodeWalkingV5Response`: 高德 V5 步行路径规划 API 响应类型
- `GaodeBicyclingV5Response`: 高德 V5 骑行路径规划 API 响应类型
- `GaodeTransitV5Response`: 高德 V5 公交路径规划 API 响应类型

### 飞书字段类型 (feishuLocation.ts)

- `FeishuLocationField`: 飞书地理位置字段值类型
- `RecordUpdateFields`: 用于更新飞书记录的字段值结构
- `RecordUpdate`: 用于更新飞书记录的请求结构
- `isValidLocationField`: 用于验证有效的地理位置字段值的类型守卫函数
- `getCoordinateString`: 从地理位置字段中提取经纬度坐标的辅助函数

## 使用说明

1. 在导入类型时，优先从 `src/types` 导入，如:

   ```typescript
   import { DistanceMode, FeishuLocationField } from "../types";
   ```

2. 处理 API 响应时，使用适当的类型断言:

   ```typescript
   const data = (await response.json()) as GaodeDrivingV5Response;
   ```

3. 使用类型守卫函数验证数据结构:

   ```typescript
   if (isValidLocationField(fieldValue)) {
     // 安全地访问 fieldValue.location, fieldValue.lat 等
   }
   ```

4. 利用辅助函数简化常见操作:
   ```typescript
   const coordinateString = getCoordinateString(locationField);
   ```

## 注意事项

- 如发现 API 返回的实际数据结构与类型定义不符，请更新相应的类型定义
- 添加新的 API 调用时，应同步添加或更新对应的类型定义
- 类型定义应尽可能精确，避免使用 `any` 类型
