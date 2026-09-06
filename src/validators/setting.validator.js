export const createSettingRules={
  key:{required:true,type:"string",min:2,max:100},
  label:{type:"string",max:150},
  group:{type:"string",max:100},
  valueType:{type:"string",enum:["string","number","boolean","json","array"]},
  isSensitive:{type:"boolean"},
  isPublic:{type:"boolean"},
};
export const updateSettingRules={
  label:{type:"string",max:150},group:{type:"string",max:100},
  valueType:{type:"string",enum:["string","number","boolean","json","array"]},
  isSensitive:{type:"boolean"},isPublic:{type:"boolean"},isActive:{type:"boolean"},
};
export const bulkUpdateSettingsRules={settings:{required:true,type:"array"}};
