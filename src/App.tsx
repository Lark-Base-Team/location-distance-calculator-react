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
import {
  DistanceMode,
  FeishuLocationField,
  isValidLocationField,
  getCoordinateString,
  RecordUpdate,
  RecordUpdateFields,
} from "./types";

// 定义表单值的类型 (可以根据需要补充)
interface FormValues {
  table?: string;
  latitudeField?: string;
  longitudeField?: string;
  distanceType?: DistanceMode;
  drivingStrategy?: string;
  transitStrategy?: string;
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
  const [distanceType, setDistanceType] = useState<string>("direct");

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
          // Directly set State
          setSelectedTableId(initialTableId);
          // Initialize form value - no need for setTimeout
          // formApi.current?.setValue('table', initialTableId); // This will be handled in the selectedTableId effect
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
        Toast.error(t("error_fetching_tables"));
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
        // Ensure FormApi clears form values when available
        // This logic moved to the selectedTableId effect below to avoid repetition
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
        Toast.error(t("error_fetching_fields"));
        setLocationFields([]);
        setNumberFields([]);
      } finally {
        console.log(
          "Effect 2: Entering finally block, setting loading to false."
        ); // Confirm finally execution
        setLoading(false);
      }
    };

    fetchFields();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTableId]); // Remove t, only depend on selectedTableId

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
        // transitStrategy 不清空，保留用户选择或默认值
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
        // transitStrategy: undefined,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTableId]); // 依赖 selectedTableId

  // 新增 Effect: 确保 formApi 初始化后，distanceType 状态与表单值同步
  useEffect(() => {
    if (formApi.current) {
      const currentFormDistanceType = formApi.current.getValue("distanceType");
      if (currentFormDistanceType && currentFormDistanceType !== distanceType) {
        setDistanceType(currentFormDistanceType);
        console.log(
          "Synced distanceType state with form value:",
          currentFormDistanceType
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distanceType]); // 移除 formApi.current 从依赖项，因为它是 ref

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
  // (已移除)

  // 请求停止处理
  const requestStop = useCallback(() => {
    console.log("Stop requested");
    setIsStopping(true);
    Toast.info(t("stopping_process"));
  }, [t]);

  // Helper function to fetch all records using pagination
  const getAllRecords = async (table: any): Promise<IRecord[]> => {
    let allRecords: IRecord[] = [];
    let pageToken: string | undefined = undefined;
    let hasMore = true;
    const BATCH_FETCH_SIZE = 200;

    console.log(
      `Starting to fetch all records using ByPage (batch size: ${BATCH_FETCH_SIZE})...`
    );

    while (hasMore) {
      if (isStoppingRef.current) {
        console.log("Record fetching stopped by user.");
        throw new Error(t("process_stopped_during_fetch"));
      }
      try {
        const res: IGetRecordsResponse = await table.getRecordsByPage({
          pageSize: BATCH_FETCH_SIZE,
          pageToken: pageToken,
        });
        allRecords = allRecords.concat(res.records);
        hasMore = res.hasMore;
        pageToken = res.pageToken;
        console.log(
          `Fetched ${res.records.length} records (ByPage). Total fetched: ${allRecords.length}. Has more: ${hasMore}`
        );
      } catch (error) {
        console.error("Error fetching records batch (ByPage):", error);
        throw new Error(
          t("error_fetching_records_batch", {
            errorMessage: (error as Error).message || String(error),
          })
        );
      }
    }
    console.log(`Finished fetching all ${allRecords.length} records (ByPage).`);
    return allRecords;
  };

  const handleSubmit = useCallback(
    async (values: FormValues) => {
      console.log("Form submitted:", values);
      setIsStopping(false);
      isStoppingRef.current = false;

      // --- Input validation ---
      if (
        !values.table ||
        !values.latitudeField ||
        !values.longitudeField ||
        !values.distanceType // Use distanceType from values
      ) {
        Toast.error(t("form_incomplete_error"));
        return;
      }
      if (values.latitudeField === values.longitudeField) {
        Toast.error(t("latitude_longitude_field_error"));
        return;
      }
      if (
        values.outputField_distance &&
        values.outputField_duration &&
        values.outputField_distance === values.outputField_duration
      ) {
        Toast.error(t("output_field_same_error"));
        return;
      }

      // Restore validation: Check if both output fields are unselected (undefined)
      if (!values.outputField_distance && !values.outputField_duration) {
        Toast.error(t("output_field_error"));
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

        // --- Fetch ALL records first using the helper ---
        const allRecords = await getAllRecords(table);
        const totalRecordCount = allRecords.length;
        // --- End fetch ---

        // --- Process records in batches ---
        for (let i = 0; i < totalRecordCount; i += BATCH_SIZE) {
          if (isStoppingRef.current) {
            console.log("Processing stopped by user.");
            Toast.warning(t("process_stopped"));
            break;
          }

          const batchRecords = allRecords.slice(i, i + BATCH_SIZE);
          const updates: { recordId: string; fields: Record<string, any> }[] =
            [];

          // Iterate over the records fetched for the current batch
          for (const record of batchRecords) {
            if (isStoppingRef.current) {
              console.log("Processing stopped by user inside batch loop.");
              break; // Exit inner loop
            }

            const recordId = record.recordId; // Get recordId from the record object

            try {
              // Access fields directly from the fetched record object
              const startCell = record.fields[latitudeField.id];
              const endCell = record.fields[longitudeField.id];

              // Validation logic remains the same
              const isValidLocation = isValidLocationField;

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
                continue;
              }

              // Parameter construction remains the same
              const originString = getCoordinateString(startCell);
              const destinationString = getCoordinateString(endCell);
              const originCity = startCell.cityname;
              const destinationCity = endCell.cityname;

              if (values.distanceType === "transit") {
                console.log(
                  `Record ${recordId}: Transit calculation - Origin City: '${originCity}', Destination City: '${destinationCity}'`
                );
              }

              // Distance calculation remains the same
              const result: CalculateDistanceResult = await calculateDistance(
                originString,
                destinationString,
                originCity,
                destinationCity,
                values.distanceType!,
                apiKey,
                values.distanceType === "driving"
                  ? values.drivingStrategy
                  : values.distanceType === "transit"
                  ? values.transitStrategy
                  : undefined
              );

              // Update collection remains the same
              const recordUpdateFields: RecordUpdateFields = {};
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
                updates.push({
                  recordId: recordId,
                  fields: recordUpdateFields,
                } as RecordUpdate);
                successCount++;
              } else {
                if (!outputFieldDistance && !outputFieldDuration) {
                  console.log(
                    `Skipping record ${recordId}: No output fields selected.`
                  );
                } else {
                  console.log(
                    `Record ${recordId}: No valid results to update for selected output fields.`
                  );
                }
                skipCount++;
              }
            } catch (err: any) {
              console.error(`Error processing record ${recordId}:`, err);
              errorCount++;
              Notification.error({
                title: t("record_error_title"),
                content: t("record_error_content", {
                  recordId: recordId,
                  errorMessage: err.message || String(err),
                }),
                duration: 5,
              });
              // Continue with the next record
            }

            // --- Add Delay After Each API Call in Inner Loop ---
            const INNER_LOOP_DELAY = 50; // 50ms delay
            await new Promise((resolve) =>
              setTimeout(resolve, INNER_LOOP_DELAY)
            );
            // --- End Delay ---
          } // End inner loop (processing batch records)

          // Check stop status before batch update
          if (isStoppingRef.current) {
            console.log("Stop requested before batch update.");
            Toast.warning(t("process_stopped_before_update"));
            break; // Exit outer loop
          }

          // Batch update remains the same
          if (updates.length > 0) {
            await table.setRecords(updates);
            console.log(
              `Batch ${i / BATCH_SIZE + 1} updated ${updates.length} records.`
            );
          }

          // Delay between batches remains the same
          if (i + BATCH_SIZE < totalRecordCount) {
            await new Promise((resolve) =>
              setTimeout(resolve, DELAY_BETWEEN_BATCHES)
            );
          }
        } // End outer loop (iterating through all records in batches)
      } catch (error: any) {
        console.error("Error during processing:", error);
        // Handle errors from getAllRecords or other initial setup
        if (error.message === t("process_stopped_during_fetch")) {
          Toast.warning(t("process_stopped_during_fetch"));
        } else {
          Toast.error(
            t("processing_error", {
              errorMessage: error.message || String(error),
            })
          );
        }
      } finally {
        setLoading(false);
        setIsStopping(false);
        isStoppingRef.current = false;
        const endTime = performance.now();
        const durationSeconds = ((endTime - startTime) / 1000).toFixed(2);
        console.log(`Processing finished in ${durationSeconds} seconds.`);
        if (isStoppingRef.current) {
          Toast.info(t("process_manually_stopped"));
        } else {
          Toast.success(
            t("process_complete", {
              successCount: successCount,
              errorCount: errorCount,
              skipCount: skipCount,
              durationSeconds: durationSeconds,
            })
          );
        }
      }
    },
    [t, locationFields, numberFields]
  );

  return (
    <main className="main">
      <Spin spinning={loading} tip={t("processing_data")}>
        <Form<FormValues>
          labelPosition="top"
          onSubmit={handleSubmit}
          getFormApi={(api) => (formApi.current = api)}
          initValues={{
            distanceType: "direct",
            drivingStrategy: "32",
            transitStrategy: "0",
          }}
          onValueChange={(values, changedValues) => {
            if (changedValues.hasOwnProperty("distanceType")) {
              const newDistanceType = values.distanceType;
              console.log("Form distanceType changed to:", newDistanceType);
              if (newDistanceType) {
                setDistanceType(newDistanceType);
              }

              if (newDistanceType !== "driving") {
                formApi.current?.setValue("drivingStrategy", undefined);
              } else {
                formApi.current?.setValue("drivingStrategy", "32");
              }
            }
          }}
        >
          <Form.Slot>
            <p>{t("text_description")}</p>
            <p>{t("text_description_2")}</p>
          </Form.Slot>
          <Form.Select
            field="table"
            label={t("select_table")}
            placeholder={t("select_table_placeholder")}
            style={{ width: "100%" }}
            rules={[{ required: true, message: t("field_required") }]}
            optionList={tableMetaList.map(({ name, id }) => ({
              label: name,
              value: id,
            }))}
            onChange={(value) => handleTableChange(value as string | null)}
          ></Form.Select>
          <Form.Select
            field="latitudeField"
            label={t("select_latitude_field")}
            placeholder={t("select_latitude_field_placeholder")}
            style={{ width: "100%" }}
            rules={[{ required: true, message: t("field_required") }]}
            optionList={fieldMetaToOptions(locationFields)}
            disabled={!selectedTableId}
          ></Form.Select>
          <Form.Select
            field="longitudeField"
            label={t("select_longitude_field")}
            placeholder={t("select_longitude_field_placeholder")}
            style={{ width: "100%" }}
            rules={[{ required: true, message: t("field_required") }]}
            optionList={fieldMetaToOptions(locationFields)}
            disabled={!selectedTableId}
          ></Form.Select>
          <Form.Select
            field="distanceType"
            label={t("select_type")}
            placeholder={t("select_type_placeholder")}
            style={{ width: "100%" }}
            rules={[{ required: true, message: t("field_required") }]}
            optionList={[
              { label: t("direct"), value: "direct" },
              { label: t("driving"), value: "driving" },
              { label: t("walking"), value: "walking" },
              { label: t("bicycling"), value: "bicycling" },
              { label: t("transit"), value: "transit" },
            ]}
          ></Form.Select>

          {distanceType === "driving" && (
            <Form.Select
              field="drivingStrategy"
              label={t("select_driving_strategy")}
              placeholder={t("select_driving_strategy_placeholder")}
              style={{ width: "100%" }}
              optionList={[
                {
                  label: t("driving_strategy_speed_priority"),
                  value: "0",
                },
                {
                  label: t("driving_strategy_cost_priority"),
                  value: "1",
                },
                {
                  label: t("driving_strategy_conventional_fastest"),
                  value: "2",
                },
                {
                  label: t("driving_strategy_amap_recommended"),
                  value: "32",
                },
                {
                  label: t("driving_strategy_avoid_congestion"),
                  value: "33",
                },
                {
                  label: t("driving_strategy_highway_priority"),
                  value: "34",
                },
                {
                  label: t("driving_strategy_avoid_highway"),
                  value: "35",
                },
                {
                  label: t("driving_strategy_less_charge"),
                  value: "36",
                },
                {
                  label: t("driving_strategy_main_road"),
                  value: "37",
                },
                {
                  label: t("driving_strategy_speed_fastest"),
                  value: "38",
                },
                {
                  label: t(
                    "driving_strategy_avoid_congestion_highway_priority"
                  ),
                  value: "39",
                },
                {
                  label: t("driving_strategy_avoid_congestion_avoid_highway"),
                  value: "40",
                },
                {
                  label: t("driving_strategy_avoid_congestion_less_charge"),
                  value: "41",
                },
                {
                  label: t("driving_strategy_less_charge_avoid_highway"),
                  value: "42",
                },
                {
                  label: t(
                    "driving_strategy_avoid_congestion_less_charge_avoid_highway"
                  ),
                  value: "43",
                },
                {
                  label: t("driving_strategy_avoid_congestion_main_road"),
                  value: "44",
                },
                {
                  label: t("driving_strategy_avoid_congestion_speed_fastest"),
                  value: "45",
                },
              ]}
            ></Form.Select>
          )}

          {distanceType === "transit" && (
            <Form.Select
              field="transitStrategy"
              label={t("select_transit_strategy")}
              placeholder={t("select_transit_strategy_placeholder")}
              style={{ width: "100%" }}
              optionList={[
                {
                  label: t("transit_strategy_recommend_v5"),
                  value: "0",
                },
                {
                  label: t("transit_strategy_cheapest"),
                  value: "1",
                },
                {
                  label: t("transit_strategy_least_transfer"),
                  value: "2",
                },
                {
                  label: t("transit_strategy_least_walk"),
                  value: "3",
                },
                {
                  label: t("transit_strategy_most_comfortable"),
                  value: "4",
                },
                {
                  label: t("transit_strategy_no_subway"),
                  value: "5",
                },
                {
                  label: t("transit_strategy_subway_priority_v5"),
                  value: "7",
                },
                {
                  label: t("transit_strategy_shortest_time"),
                  value: "8",
                },
              ]}
            ></Form.Select>
          )}

          <Form.Select
            field="outputField_distance"
            label={t("select_output_field_distance")}
            placeholder={t("select_output_field_distance_placeholder")}
            style={{ width: "100%" }}
            optionList={[
              { label: t("none_output"), value: undefined },
              ...fieldMetaToOptions(numberFields),
            ]}
            disabled={!selectedTableId}
          ></Form.Select>
          <Form.Select
            field="outputField_duration"
            label={t("select_output_field_duration")}
            placeholder={t("select_output_field_duration_placeholder")}
            style={{ width: "100%" }}
            optionList={[
              { label: t("none_output"), value: undefined },
              ...fieldMetaToOptions(numberFields),
            ]}
            disabled={!selectedTableId}
          ></Form.Select>
          <Form.Input
            field="customApiKey"
            label={t("custom_api_key_label")}
            placeholder={t("custom_api_key_placeholder")}
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
          {t("submit")}
        </Button>
        {loading && (
          <Button
            theme="light"
            type="danger"
            onClick={requestStop}
            style={{ flexShrink: 0 }}
          >
            {t("stop")}
          </Button>
        )}
      </div>
    </main>
  );
}
