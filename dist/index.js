var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
export function useCheckbox() {
    var groupNames = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        groupNames[_i] = arguments[_i];
    }
    var _a = __read(useState(new Set()), 2), checkedItemIds = _a[0], setCheckedItemIds = _a[1];
    var checkedItemIdsRef = useRef(checkedItemIds);
    checkedItemIdsRef.current = checkedItemIds;
    var childrenByItemRef = useRef({});
    var groupByItem = useRef({});
    var parentByItem = useRef({});
    var allItemsRef = useRef(new Set());
    var getCheckPartiallyStatus = useCallback(function (id) {
        var _a;
        var children = Array.from((_a = childrenByItemRef.current[id], (_a !== null && _a !== void 0 ? _a : [])));
        var selfChecked = checkedItemIds.has(id);
        var anyChildChecked = !selfChecked
            ? children.some(function (child) { return checkedItemIds.has(child); })
            : true;
        return !selfChecked && anyChildChecked;
    }, [checkedItemIds]);
    var registerRelations = useCallback(function (item, parent, group) {
        allItemsRef.current.add(item);
        if (group)
            groupByItem.current[item] = group;
        if (parent) {
            if (!childrenByItemRef.current[parent])
                childrenByItemRef.current[parent] = new Set();
            childrenByItemRef.current[parent].add(item);
            parentByItem.current[item] = parent;
        }
    }, []);
    var getUnCheckedAncestors = useCallback(function (item) {
        var uncheckedDescendants = new Set();
        var checkDescendantNewStatusAndPush = function (uncheckedItem) {
            var parent = parentByItem.current[uncheckedItem];
            if (!parent)
                return;
            uncheckedDescendants.add(parent);
            checkDescendantNewStatusAndPush(parent);
        };
        checkDescendantNewStatusAndPush(item);
        return uncheckedDescendants;
    }, []);
    var getChildrenSet = useCallback(function (item) { var _a; return _a = childrenByItemRef.current[item], (_a !== null && _a !== void 0 ? _a : new Set()); }, []);
    var getAllDescendantsSet = useCallback(function (item) {
        var descendants = new Set();
        var pushChildrenOfItem = function (item) {
            getChildrenSet(item).forEach(function (child) {
                descendants.add(child);
                pushChildrenOfItem(child);
            });
        };
        pushChildrenOfItem(item);
        return descendants;
    }, [getChildrenSet]);
    var getCheckedAncestorsSet = useCallback(function (checkedItem) {
        var checkedAncestors = new Set();
        var checkAncestorNewStatusAndPush = function (checkedItem) {
            var parent = parentByItem.current[checkedItem];
            if (!parent)
                return;
            var childrenOfParent = childrenByItemRef.current[parent];
            var allChildrenChecked = Array.from(childrenOfParent).every(function (child) {
                return child === checkedItem ? true : checkedItemIdsRef.current.has(child);
            });
            if (allChildrenChecked) {
                checkedAncestors.add(parent);
                checkAncestorNewStatusAndPush(parent);
            }
        };
        checkAncestorNewStatusAndPush(checkedItem);
        return checkedAncestors;
    }, []);
    var checkItem = useCallback(function (item, parent, group) {
        setCheckedItemIds(function (currentState) {
            var allDescendants = getAllDescendantsSet(item);
            var ancestorsSet = getCheckedAncestorsSet(item);
            var updatedSet = new Set(Array.from(currentState));
            updatedSet.add(item);
            allDescendants.forEach(function (i) { return updatedSet.add(i); });
            ancestorsSet.forEach(function (i) { return updatedSet.add(i); });
            return updatedSet;
        });
    }, [getCheckedAncestorsSet, getAllDescendantsSet]);
    var uncheckItem = useCallback(function (item, parent, group) {
        var allDescendants = getAllDescendantsSet(item);
        var uncheckedAncestors = getUnCheckedAncestors(item);
        setCheckedItemIds(function (currentState) {
            var updatedSet = new Set(Array.from(currentState));
            updatedSet.delete(item);
            allDescendants.forEach(function (i) { return updatedSet.delete(i); });
            uncheckedAncestors.forEach(function (i) { return updatedSet.delete(i); });
            return updatedSet;
        });
    }, [getAllDescendantsSet, getUnCheckedAncestors]);
    var handleChangeInternal = useCallback(function (groupName) { return function (item, parent) {
        registerRelations(item, parent, groupName);
        return function (value) {
            if (value)
                checkItem(item, parent, groupName);
            else
                uncheckItem(item, parent, groupName);
        };
    }; }, [checkItem, registerRelations, uncheckItem]);
    var getCheckStatus = useCallback(function (selfId) {
        return checkedItemIdsRef.current.has(selfId);
    }, []);
    var handleChange = useMemo(function () {
        if (groupNames.length) {
            var functions_1 = {};
            groupNames.forEach(function (groupName) {
                functions_1[groupName] = handleChangeInternal(groupName);
            });
            return functions_1;
        }
        return handleChangeInternal("");
    }, [groupNames, handleChangeInternal]);
    var checkedIdsByGroupName = useMemo(function () {
        // TODO Optimize
        var result = {};
        Array.from(checkedItemIds).forEach(function (item) {
            var groupName = groupByItem.current[item];
            if (!groupName)
                return;
            if (!result[groupName])
                result[groupName] = new Set();
            result[groupName].add(item);
        });
        return result;
    }, [checkedItemIds]);
    var allChecked = !!allItemsRef.current.size &&
        checkedItemIdsRef.current.size === allItemsRef.current.size;
    var toggleAllCheckStatus = useCallback(function () {
        if (allChecked)
            setCheckedItemIds(new Set());
        else
            setCheckedItemIds(allItemsRef.current);
    }, [allChecked]);
    useEffect(function () {
        return function () {
            // Cleanup
            allItemsRef.current = new Set();
        };
    });
    return useMemo(function () { return (__assign({ onChange: handleChange, getCheckStatus: getCheckStatus,
        getCheckPartiallyStatus: getCheckPartiallyStatus, checkedIds: checkedItemIds, onToggleAll: toggleAllCheckStatus, allChecked: allChecked }, (groupNames.length
        ? { checkedIdsByGroup: checkedIdsByGroupName }
        : {}))); }, [
        allChecked,
        checkedIdsByGroupName,
        checkedItemIds,
        getCheckPartiallyStatus,
        getCheckStatus,
        groupNames.length,
        handleChange,
        toggleAllCheckStatus,
    ]);
}
