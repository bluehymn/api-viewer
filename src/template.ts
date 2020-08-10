export const DEFAULT_METHOD_TEMPLATE = `
  <%= method_name %>(<%= params_str %><% if (need_request_body) { %><% if (params_str) { %>, <% } %>reqBody: <%= req_body_type %><% } %>) {
    return this.http.<%= http_method %><<%= response_type %>>(\`<%= path %><%- query_params_str %>\`<% if (need_request_body) { %>, reqBody <% } %>);
  }
`;

export const DEFAULT_FUNCTION_TEMPLATE = `
export const <%= method_name %> = (<%= params_str %><% if (need_request_body) { %><% if (params_str) { %>, <% } %>reqBody: <%= req_body_type %><% } %>) => {
  return http.<%= http_method %><<%= response_type %>>(\`<%= path %><%- query_params_str %>\`<% if (need_request_body) { %>, reqBody <% } %>);
}
`;