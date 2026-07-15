export type JsonSchema = boolean | Record<string, unknown>;

export type SchemaIssue = {
  path: string;
  keyword: string;
  message: string;
};

const DRAFT_2020_12 = 'https://json-schema.org/draft/2020-12/schema';
const SUPPORTED_KEYWORDS = new Set([
  '$schema',
  '$id',
  'title',
  'description',
  'type',
  'required',
  'properties',
  'additionalProperties',
  'const',
  'enum',
  'minLength',
  'pattern',
  'minItems',
  'items',
]);
const JSON_TYPES = new Set(['object', 'array', 'string', 'number', 'integer', 'boolean', 'null']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function valueHasType(value: unknown, type: string): boolean {
  switch (type) {
    case 'object': return isRecord(value);
    case 'array': return Array.isArray(value);
    case 'string': return typeof value === 'string';
    case 'number': return typeof value === 'number' && Number.isFinite(value);
    case 'integer': return typeof value === 'number' && Number.isInteger(value);
    case 'boolean': return typeof value === 'boolean';
    case 'null': return value === null;
    default: return false;
  }
}

function childPath(parent: string, child: string | number): string {
  return parent === '$' ? `$.${child}` : `${parent}.${child}`;
}

export function validateJsonSchemaValue(
  value: unknown,
  schema: JsonSchema,
  path = '$',
): SchemaIssue[] {
  if (schema === true) return [];
  if (schema === false) {
    return [{ path, keyword: 'falseSchema', message: 'value is forbidden' }];
  }

  const issues: SchemaIssue[] = [];
  const type = typeof schema.type === 'string' ? schema.type : null;
  if (type && !valueHasType(value, type)) {
    return [{ path, keyword: 'type', message: `expected ${type}` }];
  }

  if ('const' in schema && !sameJson(value, schema.const)) {
    issues.push({ path, keyword: 'const', message: `expected ${JSON.stringify(schema.const)}` });
  }

  if (Array.isArray(schema.enum) && !schema.enum.some((item) => sameJson(item, value))) {
    issues.push({ path, keyword: 'enum', message: 'value is not in the allowed set' });
  }

  if (typeof value === 'string') {
    if (typeof schema.minLength === 'number' && value.length < schema.minLength) {
      issues.push({ path, keyword: 'minLength', message: `must contain at least ${schema.minLength} characters` });
    }
    if (typeof schema.pattern === 'string' && !new RegExp(schema.pattern).test(value)) {
      issues.push({ path, keyword: 'pattern', message: `must match ${schema.pattern}` });
    }
  }

  if (Array.isArray(value)) {
    if (typeof schema.minItems === 'number' && value.length < schema.minItems) {
      issues.push({ path, keyword: 'minItems', message: `must contain at least ${schema.minItems} items` });
    }
    if (isRecord(schema.items) || typeof schema.items === 'boolean') {
      value.forEach((item, index) => {
        issues.push(...validateJsonSchemaValue(item, schema.items as JsonSchema, childPath(path, index)));
      });
    }
  }

  if (isRecord(value)) {
    const required = Array.isArray(schema.required) ? schema.required : [];
    for (const key of required) {
      if (typeof key === 'string' && !(key in value)) {
        issues.push({ path: childPath(path, key), keyword: 'required', message: 'required property is missing' });
      }
    }

    const properties = isRecord(schema.properties) ? schema.properties : {};
    for (const [key, childSchema] of Object.entries(properties)) {
      if (key in value && (isRecord(childSchema) || typeof childSchema === 'boolean')) {
        issues.push(...validateJsonSchemaValue(value[key], childSchema, childPath(path, key)));
      }
    }

    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!(key in properties)) {
          issues.push({ path: childPath(path, key), keyword: 'additionalProperties', message: 'property is not allowed' });
        }
      }
    }
  }

  return issues;
}

function inspectSchemaNode(value: unknown, path: string, issues: SchemaIssue[]): void {
  if (typeof value === 'boolean') return;
  if (!isRecord(value)) {
    issues.push({ path, keyword: 'meta:type', message: 'schema node must be an object or boolean' });
    return;
  }

  for (const keyword of Object.keys(value)) {
    if (!SUPPORTED_KEYWORDS.has(keyword)) {
      issues.push({ path: childPath(path, keyword), keyword: 'meta:vocabulary', message: 'keyword is outside the supported Draft 2020-12 vocabulary' });
    }
  }

  if (value.type !== undefined && (typeof value.type !== 'string' || !JSON_TYPES.has(value.type))) {
    issues.push({ path: childPath(path, 'type'), keyword: 'meta:type', message: 'type must name one supported JSON type' });
  }
  if (value.required !== undefined && (!Array.isArray(value.required) || value.required.some((item) => typeof item !== 'string'))) {
    issues.push({ path: childPath(path, 'required'), keyword: 'meta:required', message: 'required must be an array of strings' });
  }
  if (value.enum !== undefined && (!Array.isArray(value.enum) || value.enum.length === 0)) {
    issues.push({ path: childPath(path, 'enum'), keyword: 'meta:enum', message: 'enum must be a non-empty array' });
  }
  if (value.pattern !== undefined) {
    if (typeof value.pattern !== 'string') {
      issues.push({ path: childPath(path, 'pattern'), keyword: 'meta:pattern', message: 'pattern must be a string' });
    } else {
      try {
        new RegExp(value.pattern);
      } catch {
        issues.push({ path: childPath(path, 'pattern'), keyword: 'meta:pattern', message: 'pattern must compile' });
      }
    }
  }

  if (value.properties !== undefined) {
    if (!isRecord(value.properties)) {
      issues.push({ path: childPath(path, 'properties'), keyword: 'meta:properties', message: 'properties must be an object' });
    } else {
      for (const [key, child] of Object.entries(value.properties)) {
        inspectSchemaNode(child, childPath(childPath(path, 'properties'), key), issues);
      }
    }
  }
  if (value.items !== undefined) inspectSchemaNode(value.items, childPath(path, 'items'), issues);
  if (value.additionalProperties !== undefined && value.additionalProperties !== false && value.additionalProperties !== true) {
    inspectSchemaNode(value.additionalProperties, childPath(path, 'additionalProperties'), issues);
  }
}

export function validateSupportedDraft202012Schema(schema: unknown): SchemaIssue[] {
  const issues: SchemaIssue[] = [];
  if (!isRecord(schema)) {
    return [{ path: '$', keyword: 'meta:type', message: 'root schema must be an object' }];
  }
  if (schema.$schema !== DRAFT_2020_12) {
    issues.push({ path: '$.$schema', keyword: 'meta:$schema', message: `expected ${DRAFT_2020_12}` });
  }
  if (typeof schema.$id !== 'string' || schema.$id.length === 0) {
    issues.push({ path: '$.$id', keyword: 'meta:$id', message: 'schema must declare a non-empty $id' });
  }
  inspectSchemaNode(schema, '$', issues);
  return issues;
}
