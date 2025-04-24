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
  IRecord,
  IGetRecordsResponse,
  IRecordValue,
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
  const [isStopping, setIsStopping] = useState(false);
  const isStoppingRef = useRef(isStopping);
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

  // 更新 ref 当 isStopping 变化时
  useEffect(() => {
    isStoppingRef.current = isStopping;
  }, [isStopping]);

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

  // 请求停止处理
  const requestStop = useCallback(() => {
    console.log("Stop requested");
    setIsStopping(true);
    Toast.info(t("stopping_process", "正在尝试停止..."));
  }, [t]);

  const handleSubmit = useCallback(
    async (values: FormValues) => {
      console.log("Form submitted:", values);
      setIsStopping(false);
      isStoppingRef.current = false;

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
      const startTime = performance.now();
      const apiKey = values.customApiKey || DEFAULT_API_KEY;
      const BATCH_SIZE = 10;
      const DELAY_BETWEEN_BATCHES = 100;

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

        for (let i = 0; i < recordIdList.length; i += BATCH_SIZE) {
          if (isStoppingRef.current) {
            console.log("Processing stopped by user.");
            Toast.warning(t("process_stopped", "处理已中止"));
            break;
          }

          const batchRecordIds = recordIdList.slice(i, i + BATCH_SIZE);
          // 移除错误的 getRecordsByIds 调用
          // const recordValues: IRecordValue[] = await table.getRecordsByIds(batchRecordIds);

          const updates: { recordId: string; fields: Record<string, any> }[] =
            [];

          // 遍历当前批次的 record ID
          for (const recordId of batchRecordIds) {
            if (isStoppingRef.current) {
              console.log(
                "Processing stopped by user inside batch loop over IDs."
              );
              break; // 跳出内层循环 (遍历 ID)
            }

            try {
              // 为每个 ID 获取记录值
              const recordValue: IRecordValue = await table.getRecordById(
                recordId
              );

              // 从 recordValue.fields 中获取单元格值
              const startCell = recordValue.fields[latitudeField.id];
              const endCell = recordValue.fields[longitudeField.id];

              // 检查单元格值是否是有效的地理位置对象
              const isValidLocation = (
                cell: any
              ): cell is {
                location: string;
                cityname?: string;
                lat?: number;
                lon?: number;
              } =>
                cell &&
                typeof cell === "object" &&
                typeof cell.location === "string";

              if (
                !isValidLocation(startCell) ||
                !isValidLocation(endCell) ||
                !startCell.location ||
                !endCell.location
              ) {
                console.log(
                  `Skipping record ${recordId}: Missing or invalid location data.`
                );
                skipCount++;
                continue; // 继续处理下一个 recordId
              }

              // 构造起点和终点参数 (优先使用经纬度)
              const originString =
                startCell.lon !== undefined && startCell.lat !== undefined
                  ? `${startCell.lon},${startCell.lat}`
                  : startCell.location;
              const destinationString =
                endCell.lon !== undefined && endCell.lat !== undefined
                  ? `${endCell.lon},${endCell.lat}`
                  : endCell.location;

              // 获取城市信息 (公交需要)
              const originCity = startCell.cityname;
              const destinationCity = endCell.cityname;

              // 调用 calculateDistance
              const result: CalculateDistanceResult = await calculateDistance(
                originString,
                destinationString,
                originCity,
                destinationCity,
                values.distanceType!,
                apiKey,
                values.drivingStrategy
              );

              const recordUpdateFields: Record<string, any> = {};
              let updated = false;

              if (
                outputFieldDistance &&
                result.distance !== null &&
                result.distance !== undefined
              ) {
                recordUpdateFields[outputFieldDistance.id] = result.distance;
                updated = true;
              }
              if (
                outputFieldDuration &&
                result.duration !== null &&
                result.duration !== undefined
              ) {
                recordUpdateFields[outputFieldDuration.id] = result.duration;
                updated = true;
              }

              if (updated) {
                // 将需要更新的记录和字段收集起来
                updates.push({
                  recordId: recordId,
                  fields: recordUpdateFields,
                });
                successCount++;
              } else {
                console.log(`Record ${recordId}: No valid results to update.`);
                // 如果没有计算出任何有效结果，也算作跳过？或者单独计数？暂计入 skip
                skipCount++;
              }
            } catch (err: any) {
              console.error(`Error processing record ${recordId}:`, err);
              errorCount++;
              Notification.error({
                title: t("record_error_title", "记录处理错误"),
                content: t(
                  "record_error_content",
                  `记录 ID: ${recordId} 计算失败: ${err.message || err}`
                ),
                duration: 5,
              });
              // 单条记录错误不中断整个过程
            }
          } // 内层循环结束 (遍历 batchRecordIds)

          // 在处理完一个批次的所有记录后，再次检查停止状态
          if (isStoppingRef.current) {
            console.log("Stop requested before batch update.");
            Toast.warning(
              t("process_stopped_before_update", "处理已中止，部分数据未写入")
            );
            break; // 跳出外层循环 (遍历 BATCH_SIZE)
          }

          // 批量更新当前批次收集到的所有更改
          if (updates.length > 0) {
            await table.setRecords(updates);
            console.log(
              `Batch ${i / BATCH_SIZE + 1} updated ${updates.length} records.`
            );
          }

          if (i + BATCH_SIZE < recordIdList.length) {
            await new Promise((resolve) =>
              setTimeout(resolve, DELAY_BETWEEN_BATCHES)
            );
          }
        }
      } catch (error: any) {
        console.error("Error during batch processing:", error);
        Toast.error(
          t(
            "batch_processing_error",
            `批量处理时出错: ${error.message || error}`
          )
        );
      } finally {
        setLoading(false);
        setIsStopping(false);
        isStoppingRef.current = false;
        const endTime = performance.now();
        const durationSeconds = ((endTime - startTime) / 1000).toFixed(2);
        console.log(`Processing finished in ${durationSeconds} seconds.`);
        if (isStoppingRef.current) {
          Toast.info(t("process_manually_stopped", "处理已被用户停止"));
        } else {
          Toast.success(
            t(
              "process_complete",
              `处理完成！成功: ${successCount}, 失败: ${errorCount}, 跳过: ${skipCount}. 耗时: ${durationSeconds} 秒`
            )
          );
        }
      }
    },
    [t, locationFields, numberFields]
  );

  return (
    <main className="main">
      <Spin spinning={loading} tip={t("processing_data", "处理中...")}>
        <Form<FormValues>
          labelPosition="top"
          onSubmit={handleSubmit}
          getFormApi={(api) => (formApi.current = api)}
          initValues={{ distanceType: "driving", drivingStrategy: "32" }}
          onValueChange={(values) => {
            if (
              values.distanceType !== undefined &&
              values.distanceType !== distanceType
            ) {
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
            onChange={(value) => handleTableChange(value as string | null)}
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
            onChange={handleDistanceTypeChange}
          ></Form.Select>

          {distanceType === "driving" && (
            <Form.Select
              field="drivingStrategy"
              label={t("select_driving_strategy", "选择驾车策略")}
              placeholder={t(
                "select_driving_strategy_placeholder",
                "选择驾车路线偏好"
              )}
              style={{ width: "100%" }}
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
              "输入您的高德 Web 服务 API Key (可选)"
            )}
            style={{ width: "100%" }}
          />
        </Form>
      </Spin>

      <div style={{ marginTop: "16px", display: "flex", gap: "8px" }}>
        <Button
          theme="solid"
          onClick={() => formApi.current?.submitForm()}
          disabled={loading}
          style={{ flexGrow: 1 }}
        >
          {t("submit", "开始计算")}
        </Button>
        {loading && (
          <Button
            theme="light"
            type="danger"
            onClick={requestStop}
            style={{ flexShrink: 0 }}
          >
            {t("stop", "停止")}
          </Button>
        )}
      </div>
    </main>
  );
}
