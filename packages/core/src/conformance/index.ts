export {
  runPlaneConformance,
  runPlaneContractVector,
  validatePlaneContract,
  type PlaneConformanceCheck,
  type PlaneConformanceEvidenceV0,
  type PlaneConformanceReport,
  type PlaneContractValidation,
  type PlaneProfile,
} from './runner';

export {
  validateJsonSchemaValue,
  validateSupportedDraft202012Schema,
  type JsonSchema,
  type SchemaIssue,
} from './schema-validator';

export { default as sharedPlaneProfileV0Schema } from '../contracts/shared-plane-profile.v0.schema.json';
export { default as localPlaneProfileV0Schema } from '../contracts/local-plane-profile.v0.schema.json';
export { default as remotePlaneProfileV0Schema } from '../contracts/remote-plane-profile.v0.schema.json';
export { default as planeConformanceEvidenceV0Schema } from '../contracts/plane-conformance-evidence.v0.schema.json';
