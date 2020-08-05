import * as vscode from 'vscode';
import { APIGroup } from './types';
import * as _ from 'lodash';
import got from 'got';
import { adapter } from './adapter';
import { getConfiguration } from './utils/vscode';

export async function syncFromYapi() {
  let groups: APIGroup[] = [];
  // 读取配置文件
  const email = getConfiguration('api-viewer.yapi', 'email');
  const password = getConfiguration('api-viewer.yapi', 'password');
  let url = _.trim(getConfiguration('api-viewer.yapi', 'url') as string);
  url = url.match(/\/$/) ? url : url + '/';
  const pid = _.trim(getConfiguration('api-viewer.yapi', 'pid') as string);

  if (!(email && password && url && pid)) {
    return new Error('APIViewer: Missing some configurations!');
  }

  vscode.window.showInformationMessage('APIViewer: Syncing data from Yapi');

  // 登录获取cookie
  const response = await got(`${url}api/user/login`, {
    method: 'POST',
    json: { email, password },
  });

  const responseJson = JSON.parse(response.body);
  if (responseJson.errcode === 405) {
    return new Error('APIViewer: Incorrect account or password');
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
    return new Error('APIViewer: Invalid data format');
  }

  return groups;
}
