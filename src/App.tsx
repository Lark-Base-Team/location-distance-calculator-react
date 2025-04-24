import "./App.css";
import {
  bitable,
  FieldType,
  IFieldMeta,
  ITableMeta,
  ILocationFieldMeta,
  INumberFieldMeta,
  Selection,
  ILocationField,
  INumberField,
} from "@lark-base-open/js-sdk";
import {
  Button,
  Form,
  Select,
  Spin,
  Toast,
  Notification,
  Input,
} from "@douyinfe/semi-ui";
import { BaseFormApi } from "@douyinfe/semi-foundation/lib/es/form/interface";
import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  calculateDistance,
  DEFAULT_API_KEY,
  CalculateDistanceResult,
} from "./utils/geo";

// 定义表单值的类型 (可以根据需要补充)
interface FormValues {
  table?: string;
  latitudeField?: string;
  longitudeField?: string;
  distanceType?: string;
  drivingStrategy?: string;
  outputField_distance?: string;
  outputField_duration?: string;
  customApiKey?: string;
}

// 辅助函数：将字段元数据转换为 Select 选项
const fieldMetaToOptions = (fieldMetaList: IFieldMeta[]) => {
  return fieldMetaList.map(({ name, id }) => ({
    label: name,
    value: id,
  }));
};

export default function App() {
  const { t } = useTranslation();
  const formApi = useRef<BaseFormApi<FormValues>>();
  const [loading, setLoading] = useState(false);
  const [tableMetaList, setTableMetaList] = useState<ITableMeta[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [locationFields, setLocationFields] = useState<ILocationFieldMeta[]>(
    []
  );
  const [numberFields, setNumberFields] = useState<INumberFieldMeta[]>([]);
  // 恢复 distanceType state
  const [distanceType, setDistanceType] = useState<string | undefined>(
    undefined // 初始化为 undefined 或默认值
  );

  // Effect 1: 加载数据表列表和初始选中项
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [metaList, selection] = await Promise.all([
          bitable.base.getTableMetaList(),
          bitable.base.getSelection(),
        ]);
        setTableMetaList(metaList);
        if (selection?.tableId) {
          const initialTableId = selection.tableId;
          // 直接设置 State
          setSelectedTableId(initialTableId);
          // 初始化表单值 - 无需 setTimeout
          // formApi.current?.setValue('table', initialTableId); // 这将在 selectedTableId effect 中处理
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
        Toast.error(t("error_fetching_tables", "获取数据表列表失败"));
      }
    };
    fetchData();
  }, [t]);

  // Effect 2: 根据选中的 tableId 加载字段列表
  useEffect(() => {
    const fetchFields = async () => {
      if (!selectedTableId) {
        console.log("Effect 2: No selectedTableId, clearing fields.");
        setLocationFields([]);
        setNumberFields([]);
        // 确保 FormApi 可用时清空表单值
        // 这部分逻辑移到下面的 selectedTableId effect 中处理，避免重复
        return;
      }
      console.log("Effect 2: Starting field fetch, setting loading to true.");
      setLoading(true);
      try {
        console.log(`Effect 2: Getting table by ID: ${selectedTableId}`);
        const table = await bitable.base.getTableById(selectedTableId);
        console.log(`Effect 2: Got table, getting field meta list...`);
        const fieldMetaList = await table.getFieldMetaList();
        console.log(`Effect 2: Got field meta list, processing...`);

        const locFields = fieldMetaList.filter(
          (field): field is ILocationFieldMeta =>
            field.type === FieldType.Location
        );
        const numFields = fieldMetaList.filter(
          (field): field is INumberFieldMeta => field.type === FieldType.Number
        );

        setLocationFields(locFields);
        setNumberFields(numFields);
        console.log("Effect 2: Fields processed and set.");
      } catch (error) {
        console.error("Effect 2: Error fetching fields:", error);
        Toast.error(t("error_fetching_fields", "获取字段列表失败"));
        setLocationFields([]);
        setNumberFields([]);
      } finally {
        console.log(
          "Effect 2: Entering finally block, setting loading to false."
        ); // 确认 finally 执行
        setLoading(false);
      }
    };

    fetchFields();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTableId]); // 移除 t, 只依赖 selectedTableId

  // Effect 3: 响应 selectedTableId 变化，更新表单并清空字段
  useEffect(() => {
    if (!formApi.current) return; // 确保 formApi 已初始化

    console.log("Effect 3: selectedTableId changed to:", selectedTableId);

    if (selectedTableId) {
      // 设置 table 字段并清空相关字段
      formApi.current.setValues({
        table: selectedTableId,
        latitudeField: undefined,
        longitudeField: undefined,
        outputField_distance: undefined,
        outputField_duration: undefined,
        // drivingStrategy: undefined, // 策略不清空，依赖 distanceType
      });
    } else {
      // 清空 table 及相关字段
      formApi.current.setValues({
        table: undefined,
        latitudeField: undefined,
        longitudeField: undefined,
        outputField_distance: undefined,
        outputField_duration: undefined,
        // drivingStrategy: undefined,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTableId]); // 依赖 selectedTableId

  // Effect 4: 响应 distanceType 变化，更新表单并处理策略字段
  useEffect(() => {
    if (!formApi.current) return; // 确保 formApi 已初始化

    console.log("Effect 4: distanceType changed to:", distanceType);

    // 更新表单中的 distanceType 值
    formApi.current.setValue("distanceType", distanceType);

    // 如果不是驾车模式，清空策略
    if (distanceType !== "driving") {
      formApi.current.setValue("drivingStrategy", undefined);
    } else {
      // 如果切换回驾车模式，可以考虑设置默认策略，或保持不变让用户选择
      // formApi.current.setValue('drivingStrategy', '32'); // 设置默认高德推荐
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distanceType]); // 依赖 distanceType

  // handleTableChange 只更新 state
  const handleTableChange = useCallback((tableId: string | null) => {
    console.log("handleTableChange called with:", tableId);
    setSelectedTableId(tableId);
  }, []);

  // handleDistanceTypeChange 只更新 state
  const handleDistanceTypeChange = useCallback((value: any) => {
    console.log("handleDistanceTypeChange called with:", value);
    setDistanceType(value as string | undefined);
  }, []);

  const handleSubmit = useCallback(
    async (values: FormValues) => {
      console.log("Form submitted:", values);

      // --- 输入验证 ---
      if (
        !values.table ||
        !values.latitudeField ||
        !values.longitudeField ||
        !values.distanceType // 使用 values 中的 distanceType
      ) {
        Toast.error(t("form_incomplete_error", "请填写所有必填字段"));
        return;
      }
      if (!values.outputField_distance && !values.outputField_duration) {
        Toast.error(
          t("output_field_error", "请至少选择一个输出字段（距离或时间）")
        );
        return;
      }
      if (values.latitudeField === values.longitudeField) {
        Toast.error(
          t("latitude_longitude_field_error", "起点和终点不能是同一个字段")
        );
        return;
      }
      if (
        values.outputField_distance &&
        values.outputField_distance === values.outputField_duration
      ) {
        Toast.error(
          t("output_field_same_error", "距离和时间输出字段不能是同一个字段")
        );
        return;
      }

      setLoading(true);
      let successCount = 0;
      let errorCount = 0;
      let skipCount = 0;

      try {
        const table = await bitable.base.getTableById(values.table);
        const latitudeField = await table.getField<ILocationField>(
          values.latitudeField
        );
        const longitudeField = await table.getField<ILocationField>(
          values.longitudeField
        );
        const outputFieldDistance = values.outputField_distance
          ? await table.getField<INumberField>(values.outputField_distance)
          : null;
        const outputFieldDuration = values.outputField_duration
          ? await table.getField<INumberField>(values.outputField_duration)
          : null;
        const recordIdList = await table.getRecordIdList();

        const apiKey = values.customApiKey || DEFAULT_API_KEY;
        const currentDistanceType = values.distanceType; // 从 values 获取
        const currentDrivingStrategy =
          currentDistanceType === "driving"
            ? values.drivingStrategy
            : undefined; // 只在驾车时使用策略

        for (const recordId of recordIdList) {
          try {
            // 直接获取值，后续进行类型检查
            const latVal = await latitudeField.getValue(recordId);
            const lonVal = await longitudeField.getValue(recordId);

            // 检查地理位置值是否有效
            const isLatValid =
              latVal &&
              typeof latVal === "object" &&
              "location" in latVal &&
              typeof latVal.location === "string" &&
              latVal.location;
            const isLonValid =
              lonVal &&
              typeof lonVal === "object" &&
              "location" in lonVal &&
              typeof lonVal.location === "string" &&
              lonVal.location;

            if (!isLatValid || !isLonValid) {
              console.warn(
                `Record ${recordId}: Skipping due to missing or invalid location data.`
              );
              skipCount++;
              continue; // 跳过这条记录
            }

            // 提取需要的信息 (类型已在上一步检查中确认)
            const origin = latVal.location as string;
            const destination = lonVal.location as string;
            // 使用可选链和类型断言获取城市名
            const originCity = (latVal as any)?.cityname as string | undefined;
            const destinationCity = (lonVal as any)?.cityname as
              | string
              | undefined;

            // 调用 API 计算
            const result: CalculateDistanceResult = await calculateDistance(
              origin,
              destination,
              originCity,
              destinationCity,
              currentDistanceType, // 使用从 values 获取的类型
              apiKey,
              currentDrivingStrategy // 使用处理后的策略
            );

            console.log(`Record ${recordId}: Result =`, result);

            // 更新输出字段
            const updates: Promise<any>[] = [];
            if (outputFieldDistance && result.distance !== null) {
              // 注意：setValue 对于数字字段需要传入 number 类型
              updates.push(
                outputFieldDistance.setValue(recordId, result.distance)
              );
            }
            if (outputFieldDuration && result.duration !== null) {
              updates.push(
                outputFieldDuration.setValue(recordId, result.duration)
              );
            }

            await Promise.all(updates);
            successCount++;
          } catch (recordError) {
            console.error(`Error processing record ${recordId}:`, recordError);
            errorCount++;
            // 可以选择在这里为单条记录显示 Toast，但可能会过多
            // Toast.error(`记录 ${recordId} 处理失败: ${recordError instanceof Error ? recordError.message : String(recordError)}`);
          }
        }

        // 处理完成后的提示
        if (errorCount > 0) {
          Notification.warning({
            title: t("processing_completed_with_errors", "处理完成，但有错误"),
            content: t(
              "processing_summary",
              `成功: ${successCount}, 失败: ${errorCount}, 跳过: ${skipCount}`
            ),
            duration: 5, // 持续时间（秒）
          });
        } else {
          Toast.success(
            t(
              "completed",
              `处理完成 (成功: ${successCount}, 跳过: ${skipCount})`
            )
          );
        }
      } catch (error) {
        console.error("Error during batch processing:", error);
        Toast.error(
          `${t("processing_error", "处理过程中发生错误")}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      } finally {
        setLoading(false);
      }
    },
    [t] // 移除 distanceType 依赖
  );

  return (
    <main className="main">
      <Spin spinning={loading} tip={t("processing_data", "处理中...")}>
        <Form<FormValues>
          labelPosition="top"
          onSubmit={handleSubmit}
          getFormApi={(api) => (formApi.current = api)}
          // 设置 distanceType 的初始值，Effect 4 会将其同步到 Form
          // 设置 drivingStrategy 的初始值，Form 会直接使用
          initValues={{ distanceType: "driving", drivingStrategy: "32" }}
          // 监听 Form 值的变化，更新 distanceType state (可选，但推荐用于保持同步)
          onValueChange={(values) => {
            if (
              values.distanceType !== undefined &&
              values.distanceType !== distanceType
            ) {
              // 只有在 Form 的值和 state 不同时才更新 state，避免不必要的重渲染
              setDistanceType(values.distanceType);
            }
          }}
        >
          <Form.Slot>
            <p>{t("text_description", "选择表格和字段，计算地理位置距离。")}</p>
            <p>{t("text_description_2", "结果将写入指定的输出字段。")}</p>
          </Form.Slot>
          <Form.Select
            field="table"
            label={t("select_table", "选择数据表")}
            placeholder={t("select_table_placeholder", "请选择数据表")}
            style={{ width: "100%" }}
            rules={[
              { required: true, message: t("field_required", "此字段必填") },
            ]}
            optionList={tableMetaList.map(({ name, id }) => ({
              label: name,
              value: id,
            }))}
            // value={selectedTableId} // Form.Select 会自动处理来自 Form state 的值
            onChange={(value) => handleTableChange(value as string | null)}
            // onChange 中不再需要 setValues
          ></Form.Select>
          <Form.Select
            field="latitudeField"
            label={t("select_latitude_field", "选择起点字段 (地理位置)")}
            placeholder={t(
              "select_latitude_field_placeholder",
              "请选择起点地理位置字段"
            )}
            style={{ width: "100%" }}
            rules={[
              { required: true, message: t("field_required", "此字段必填") },
            ]}
            optionList={fieldMetaToOptions(locationFields)}
            disabled={!selectedTableId}
            // value={undefined} // 不需要手动控制 value，Form 会处理
          ></Form.Select>
          <Form.Select
            field="longitudeField"
            label={t("select_longitude_field", "选择终点字段 (地理位置)")}
            placeholder={t(
              "select_longitude_field_placeholder",
              "请选择终点地理位置字段"
            )}
            style={{ width: "100%" }}
            rules={[
              { required: true, message: t("field_required", "此字段必填") },
            ]}
            optionList={fieldMetaToOptions(locationFields)}
            disabled={!selectedTableId}
          ></Form.Select>
          <Form.Select
            field="distanceType"
            label={t("select_type", "选择距离模式")}
            placeholder={t("select_type_placeholder", "请选择计算模式")}
            style={{ width: "100%" }}
            rules={[
              { required: true, message: t("field_required", "此字段必填") },
            ]}
            optionList={[
              { label: t("direct", "直线距离"), value: "direct" },
              { label: t("driving", "驾车"), value: "driving" },
              { label: t("walking", "步行"), value: "walking" },
              { label: t("bicycling", "骑行"), value: "bicycling" },
              { label: t("transit", "公交"), value: "transit" },
            ]}
            // value={distanceType} // Form.Select 会自动处理来自 Form state 的值
            onChange={handleDistanceTypeChange} // onChange 只调用 setDistanceType
          ></Form.Select>

          {/* 恢复使用 distanceType state 进行条件渲染 */}
          {distanceType === "driving" && (
            <Form.Select
              field="drivingStrategy"
              label={t("select_driving_strategy", "选择驾车策略")}
              placeholder={t(
                "select_driving_strategy_placeholder",
                "选择驾车路线偏好"
              )}
              style={{ width: "100%" }}
              // initValue="32" // 初始值已在 Form 的 initValues 中设置
              optionList={[
                {
                  label: t("driving_strategy_fastest", "速度优先"),
                  value: "0",
                },
                { label: t("driving_strategy_cost", "费用优先"), value: "1" },
                {
                  label: t("driving_strategy_shortest", "距离最短"),
                  value: "2",
                },
                {
                  label: t("driving_strategy_default", "高德推荐"),
                  value: "32",
                },
                {
                  label: t("driving_strategy_avoid_congestion", "躲避拥堵"),
                  value: "33",
                },
                {
                  label: t("driving_strategy_avoid_highway", "不走高速"),
                  value: "35",
                },
                {
                  label: t("driving_strategy_highway_priority", "高速优先"),
                  value: "34",
                },
              ]}
            ></Form.Select>
          )}

          <Form.Select
            field="outputField_distance"
            label={t("select_output_field_distance", "输出距离字段 (数字)")}
            placeholder={t(
              "select_output_field_distance_placeholder",
              "选择用于存储距离(km)的数字字段"
            )}
            style={{ width: "100%" }}
            optionList={fieldMetaToOptions(numberFields)}
            disabled={!selectedTableId}
          ></Form.Select>
          <Form.Select
            field="outputField_duration"
            label={t("select_output_field_duration", "输出时间字段 (数字)")}
            placeholder={t(
              "select_output_field_duration_placeholder",
              "选择用于存储时间(分钟)的数字字段"
            )}
            style={{ width: "100%" }}
            optionList={fieldMetaToOptions(numberFields)}
            disabled={!selectedTableId}
          ></Form.Select>
          <Form.Input
            field="customApiKey"
            label={t("custom_api_key_label", "自定义高德 API Key (Web服务)")}
            placeholder={t(
              "custom_api_key_placeholder",
              "可选，若不填则使用内置 Key"
            )}
            style={{ width: "100%" }}
          />
          <Button theme="solid" htmlType="submit" block>
            {t("button", "开始计算")}
          </Button>
        </Form>
      </Spin>
    </main>
  );
}
