import { APIGroup, YAPI, API, RequestMethod } from './types';
import { OpenAPI, OpenAPIV3, OpenAPIV2 } from 'openapi-types';
import { JSONSchema4 } from 'json-schema';
import * as _ from 'lodash';

type OpenAPIPathObject = OpenAPIV3.PathsObject | OpenAPIV2.PathsObject;

export function adapter(data: any, type: 'yapi' | 'swagger') {
  if (type === 'yapi') {
    return transformYapi(data);
  }
  if (type === 'swagger') {
    return transformSwagger(data);
  }
  return [];
}

function transformYapi(data: YAPI.YAPIGroup[]): APIGroup[] {
  // TODO: 参数类型JSON: yapi取req_body_other, 后续支持form类型
  const groups: APIGroup[] = [];
  if (_.isArray(data)) {
    data.forEach((item) => {
      const group: APIGroup = {
        name: item.name,
        desc: item.desc,
        list: [],
      };

      item.list.forEach((i) => {
        const pathParams = i.req_params ? i.req_params.map((p) => p.name) : [];
        const queryParams = i.req_query ? i.req_query.map((p) => p.name) : [];

        let resBodySchema: JSONSchema4 = {};
        let reqBodySchema: JSONSchema4 = {};

        if (i.res_body) {
          try {
            resBodySchema = JSON.parse(i.res_body);
          } catch (e) {
            console.log('Invalid res_body');
          }
        }

        if (i.req_body_other) {
          try {
            reqBodySchema = JSON.parse(i.req_body_other);
          } catch (e) {
            console.log('Invalid req_body_other');
          }
        }

        const api: API = {
          path: i.path,
          title: i.title,
          desc: i.desc,
          method: i.method,
          pathParams,
          queryParams,
          resBody: resBodySchema,
          reqBody: reqBodySchema,
          yapi: {
            id: i._id,
          },
        };
        group.list.push(api);
      });

      groups.push(group);
    });
  }
  return groups;
}

/**
 *
 * 暂时仅支持 OpenAPIV2
 */
function transformSwagger(data: OpenAPIV2.Document) {
  const groups: APIGroup[] = [];
  const paths = data.paths;
  const methods: (keyof OpenAPIV2.PathItemObject)[] = [
    'get',
    'put',
    'post',
    'delete',
    'options',
    'head',
    'patch',
  ];
  /**
   * 通过 tags 分组
   */
  if (data.tags) {
    data.tags.forEach((item) => {
      const group: APIGroup = {
        name: item.name,
        desc: item.description || '',
        list: [],
      };
      groups.push(group);
    });
  }

  for (const i in paths) {
    const path = paths[i] as OpenAPIV2.PathItemObject;
    methods.forEach((method) => {
      const o = path[method] as OpenAPIV2.OperationObject;
      if (o) {
        const api = createAPIFromOperationObject(o, i, method);
        groups.forEach((group) => {
          if (o.tags && o.tags.indexOf(group.name) > -1) {
            group.list.push(api);
          }
        });
      }
    });
  }
  return groups;
}

function createAPIFromOperationObject(
  o: OpenAPIV2.OperationObject,
  path: string,
  method: string,
) {
  const pathParams: string[] = [];
  const queryParams: string[] = [];
  const methodUpperCase = method.toUpperCase() as RequestMethod;
  const defaultRes = o.responses?.default || o.responses['200'];
  const responseSchema = defaultRes ? (defaultRes as OpenAPIV2.ResponseObject)?.schema : undefined;
  const api: API = {
    path: path,
    title: o.summary || '',
    desc: o.description || '',
    method: methodUpperCase,
    pathParams,
    queryParams,
    resBody: responseSchema as JSONSchema4,
    reqBody: o.requestBody,
  };
  return api;
}
