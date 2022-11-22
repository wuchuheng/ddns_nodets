/**
 *  This file is part of emailNotes.
 *
 * @Description Say something for this file.
 * @Author      wuchuheng<root@wuchuheng.com>
 * @Time        2022/11/22 00:21
 */

import { networkInterfaces } from "os";
import Alidns20150109, * as $Alidns20150109 from "@alicloud/alidns20150109";
import * as $OpenApi from "@alicloud/openapi-client";
import Util, * as $Util from "@alicloud/tea-util";
import * as dotenv from "dotenv";

dotenv.config();

const networkCardName: string = process.env.NETWORK_CARD_NAME || "";
const accessKeyId: string = process.env.ACCESS_KEY_ID || "";
const accessKeySecret: string = process.env.ACCESS_KEY_SECRET || "";
const fullDomain: string = process.env.FULL_DOMAIN || "";

const fullDomainInfo = fullDomain.split(".");
const RR = fullDomainInfo.slice(0, fullDomainInfo.length - 2).join(".");
const domainName = fullDomainInfo.slice(2, fullDomainInfo.length).join(".");

const createClient = (): Alidns20150109 => {
  const config = new $OpenApi.Config({
    accessKeyId: accessKeyId,
    accessKeySecret: accessKeySecret,
  });
  // 访问的域名
  config.endpoint = "alidns.cn-shanghai.aliyuncs.com";
  return new Alidns20150109(config);
};

const getLocalIpv6 = (): string | undefined => {
  const result = networkInterfaces();
  const addressList = result[networkCardName]
    ?.filter((e) => e.family == "IPv6")
    .filter((e) => e.address.substring(0, 4) !== "fe80")
    .filter((e) => e.address.substring(0, 4) !== "fd00");
  if (addressList?.length !== 0) {
    const ipv6Address = addressList![0].address;
    return ipv6Address;
  }
};

const getRecordInfo = async (): Promise<
  { recordId: string; currentValue: string } | undefined
> => {
  const client = createClient();
  const describeDomainRecordsRequest =
    new $Alidns20150109.DescribeDomainRecordsRequest({
      domainName,
    });
  new $Alidns20150109.DescribeDomainRecordsRequest({});

  const runtime = new $Util.RuntimeOptions({});
  try {
    // 复制代码运行请自行打印 API 的返回值
    const res = await client.describeDomainRecordsWithOptions(
      describeDomainRecordsRequest,
      runtime
    );

    const miniDomain = res.body.domainRecords?.record?.filter(
      (e) => e.RR == RR
    )[0];
    if (miniDomain != undefined) {
      const recordId: string = miniDomain.recordId + "";
      const currentValue: string = miniDomain.value + "";
      return {
        recordId,
        currentValue,
      };
    }
  } catch (error) {
    // 如有需要，请打印 error
    Util.assertAsString(error);
  }
};

/// 添加记录
const addRecord = async (ipv6: string) => {
  const client = createClient();
  const addDomainRecordRequest = new $Alidns20150109.AddDomainRecordRequest({
    domainName,
    RR,
    type: "AAAA",
    value: ipv6,
  });
  const runtime = new $Util.RuntimeOptions({});
  try {
    await client.addDomainRecordWithOptions(addDomainRecordRequest, runtime);
    logInfo(`添加新记录: ${RR}.${domainName}`);
  } catch (error) {
    throw error;
  }
};

const setRecord = async (props: { recordId: string; value: string }) => {
  const client = createClient();
  const updateDomainRecordRequest =
    new $Alidns20150109.UpdateDomainRecordRequest({
      recordId: props.recordId,
      RR,
      type: "AAAA",
      value: props.value,
    });
  const runtime = new $Util.RuntimeOptions({});
  try {
    // 复制代码运行请自行打印 API 的返回值
    await client.updateDomainRecordWithOptions(
      updateDomainRecordRequest,
      runtime
    );
  } catch (error) {
    // 如有需要，请打印 error
    throw error;
  }
};
const logInfo = (info: string) => {
  const date = new Date();
  const formatNumber = (v: number) =>
    v.toString().length == 1 ? `0${v}` : v.toString();
  console.log(
    `${date.getFullYear()}-${formatNumber(date.getMonth() + 1)}-${formatNumber(
      date.getDate()
    )} ${formatNumber(date.getHours())}:${formatNumber(
      date.getMinutes()
    )}:${formatNumber(date.getSeconds())} ${info}`
  );
};

const main = async () => {
  setInterval(async () => {
    try {
      const ipv6 = getLocalIpv6();
      if (ipv6 == undefined) {
        logInfo("获取ipv6失败");
        return;
      }
      const recordInfo = await getRecordInfo();
      if (recordInfo == undefined) {
        logInfo("获取域名失败");
        await addRecord(ipv6);
        return;
      }
      if (recordInfo.currentValue != ipv6) {
        await setRecord({ recordId: recordInfo.recordId, value: ipv6 });
        logInfo(`设置ipv6: ${ipv6}`);
      } else {
        logInfo(
          `线上域名ipv6同线下一样，不用再次设置: local: ${ipv6}, onlineValue: ${recordInfo.currentValue}`
        );
      }
    } catch (e) {
      console.log(e);
    }
  }, 1000);
};

export default main();
