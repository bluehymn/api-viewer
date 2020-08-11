import * as vscode from 'vscode';
import { APIGroup } from './types';
import * as _ from 'lodash';
import got from 'got';
import { adapter } from './adapter';
import { getConfiguration } from './utils/vscode';

export async function syncFromYapi() {
  // 读取配置文件
  const email = getConfiguration<string>('api-viewer.yapi', 'email');
  const password = getConfiguration<string>('api-viewer.yapi', 'password');
  let url = _.trim(getConfiguration<string>('api-viewer.yapi', 'url'));
  url = url.match(/\/$/) ? url : url + '/';
  const pid = _.trim(getConfiguration<string>('api-viewer.yapi', 'pid'));

  if (!(email && password && url && pid)) {
    console.error('APIViewer: Missing some configurations!');
    return [];
  }

  vscode.window.showInformationMessage('APIViewer: Syncing data from Yapi');

  return await getYapiData(url, email, password, pid);
}

export async function getYapiData(
  url: string,
  email: string,
  password: string,
  pid: string,
) {
  let groups: APIGroup[] = [];
  // 登录获取cookie
  const response = await got(`${url}api/user/login`, {
    method: 'POST',
    json: { email, password },
  });

  const responseJson = JSON.parse(response.body);
  if (responseJson.errcode === 405) {
    console.error('APIViewer: Incorrect account or password');
    return [];
  }

  const cookies = response.headers['set-cookie']?.map((cookie) => {
    return cookie.split(';')[0];
  });

  // 获取接口文档数据
  const apiResponse = await got(
    `${url}api/plugin/export?type=json&pid=${pid}&status=all&isWiki=false`,
    {
      headers: {
        cookie: cookies?.join(';'),
      },
    },
  );
  try {
    const data = JSON.parse(apiResponse.body);
    groups = adapter(data, 'yapi');
  } catch (e) {
    console.error('APIViewer: Invalid data format');
    return [];
  }

  return groups;
}
