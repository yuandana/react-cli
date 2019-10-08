/**
 * 根据传入的 序列 keyOrder 对 obj 进行排序
 */
module.exports = function sortObject(obj, keyOrder, dontSortByUnicode) {
    if (!obj) return;
    const res = {};

    if (keyOrder) {
        keyOrder.forEach(key => {
            res[key] = obj[key];
            delete obj[key];
        });
    }

    const keys = Object.keys(obj);

    !dontSortByUnicode && keys.sort();
    keys.forEach(key => {
        res[key] = obj[key];
    });

    return res;
};
