export const updateData = async (modelName, criteria, dataToSet, options) => {
    options.new = true;
    options.lean = true;
    return modelName.findOneAndUpdate(criteria, dataToSet, options);
}

export const getData = async (modelName, criteria, projection, options) => {
    options.lean = true;
    return modelName.find(criteria, projection, options);
}

export const getDataWithSorting = async (modelName, criteria, projection, options) => {
    options.lean = true;
    return modelName.find(criteria, projection, options).collation({locale: "en"});
}

export const getFirstMatch = async (modelName, criteria, projection, options) => {
    options.lean = true;
    return await modelName.findOne(criteria, projection, options);
}

export const findOneAndPopulate = async (modelName, criteria, projection, options, populateModel) => {
    options.lean = true;
    return modelName.findOne(criteria, projection, options).populate(populateModel).exec();
}

export const countData = async (modelName, criteria) => {
    return modelName.countDocuments(criteria);
}

export const createData = async (modelName, objToSave) => {
    return new modelName(objToSave).save();
}

export const insertMany = async (modelName, objToSave) => {
    // const users = objToSave.map(user => new User(user));
    // return modelName.insertMany(users);
}

export async function aggregateData(modelName, criteria) {
    return modelName.aggregate(criteria);
}

export async function aggregateDataWithSorting(modelName, criteria) {
    return modelName.aggregate(criteria).collation({locale: "en"});
}

export const aggregateAndPopulate = async (modelName, criteria, populateModel) => {
    const result = await modelName.aggregate(criteria);
    return modelName.populate(result, populateModel)
}

export const updateMany = async (modelName, criteria, dataToSet, options) => {
    return modelName.updateMany(criteria, dataToSet, options);
}

export const findAllWithPopulate = async (modelName, criteria, projection, options, populateModel) => {
    options.lean = true;
    return modelName.find(criteria, projection, options).populate(populateModel);
}

export const findAllWithPopulateWithSorting = async (modelName, criteria, projection, options, populateModel) => {
    options.lean = true;
    return modelName.find(criteria, projection, options).collation({locale: "en"}).populate(populateModel);
}
