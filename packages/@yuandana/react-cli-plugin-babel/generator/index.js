// plugins 初始化之后调用
// 用于生成相应的配置文件
module.exports = pluginApi => {
    pluginApi.extendPackage({
        babel: {
            presets: ['react-app']
        }
    });
};
