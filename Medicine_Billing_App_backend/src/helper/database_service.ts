import { Model, PipelineStage, PopulateOptions, QueryOptions, UpdateQuery } from "mongoose";

type Criteria<T> = Partial<Record<keyof T | string, unknown>>;
type Projection = Record<string, unknown> | string;
type PopulateModel = string | PopulateOptions | Array<string | PopulateOptions>;

type CollationOptions = { locale: string };
const DEFAULT_COLLATION: CollationOptions = { locale: "en" };

const withLean = <T>(options?: QueryOptions<T>): QueryOptions<T> => ({
  ...options,
  lean: true,
});

export const updateData = async <T>(
  modelName: Model<T>,
  criteria: Criteria<T>,
  dataToSet: UpdateQuery<T>,
  options: QueryOptions<T> = {},
) => {
  return modelName.findOneAndUpdate(criteria as any, dataToSet, {
    ...options,
    new: true,
    lean: true,
  });
};

export const getData = async <T>(
  modelName: Model<T>,
  criteria: Criteria<T>,
  projection?: Projection,
  options?: QueryOptions<T>,
) => {
  return modelName.find(criteria as any, projection as any, withLean(options));
};

export const getDataWithSorting = async <T>(
  modelName: Model<T>,
  criteria: Criteria<T>,
  projection?: Projection,
  options?: QueryOptions<T>,
) => {
  return modelName
    .find(criteria as any, projection as any, withLean(options))
    .collation(DEFAULT_COLLATION);
};

export const getFirstMatch = async <T>(
  modelName: Model<T>,
  criteria: Criteria<T>,
  projection?: Projection,
  options?: QueryOptions<T>,
) => {
  return modelName.findOne(criteria as any, projection as any, withLean(options));
};

export const findOneAndPopulate = async <T>(
  modelName: Model<T>,
  criteria: Criteria<T>,
  projection?: Projection,
  options?: QueryOptions<T>,
  populateModel?: PopulateModel,
) => {
  return modelName
    .findOne(criteria as any, projection as any, withLean(options))
    .populate(populateModel as any)
    .exec();
};

export const countData = async <T>(modelName: Model<T>, criteria: Criteria<T>) => {
  return modelName.countDocuments(criteria as any);
};

export const createData = async <T>(modelName: Model<T>, objToSave: unknown) => {
  return modelName.create(objToSave as any);
};

export const insertMany = async <T>(modelName: Model<T>, objToSave: unknown[]) => {
  return modelName.insertMany(objToSave as any);
};

export const aggregateData = async <T>(modelName: Model<T>, criteria: PipelineStage[]) => {
  return modelName.aggregate(criteria);
};

export const aggregateDataWithSorting = async <T>(
  modelName: Model<T>,
  criteria: PipelineStage[],
) => {
  return modelName.aggregate(criteria).collation(DEFAULT_COLLATION);
};

export const aggregateAndPopulate = async <T>(
  modelName: Model<T>,
  criteria: PipelineStage[],
  populateModel: PopulateModel,
) => {
  const result = await modelName.aggregate(criteria);
  return modelName.populate(result, populateModel as any);
};

export const updateMany = async <T>(
  modelName: Model<T>,
  criteria: Criteria<T>,
  dataToSet: UpdateQuery<T>,
  options?: Record<string, unknown>,
) => {
  return modelName.updateMany(criteria as any, dataToSet, options as any);
};

export const findAllWithPopulate = async <T>(
  modelName: Model<T>,
  criteria: Criteria<T>,
  projection?: Projection,
  options?: QueryOptions<T>,
  populateModel?: PopulateModel,
) => {
  return modelName
    .find(criteria as any, projection as any, withLean(options))
    .populate(populateModel as any);
};

export const findAllWithPopulateWithSorting = async <T>(
  modelName: Model<T>,
  criteria: Criteria<T>,
  projection?: Projection,
  options?: QueryOptions<T>,
  populateModel?: PopulateModel,
) => {
  return modelName
    .find(criteria as any, projection as any, withLean(options))
    .collation(DEFAULT_COLLATION)
    .populate(populateModel as any);
};
