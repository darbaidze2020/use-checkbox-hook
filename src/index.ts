import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface Common {
  getCheckStatus: (selfId: string, parentId?: string) => boolean;
  getCheckPartiallyStatus: (selfId: string) => boolean;
  onToggleAll: () => void;
  checkedIds: Set<string>;
  allChecked: boolean;
}
type OnChangeFn = (
  selfId: string,
  parentId?: string
) => (value: boolean) => void;

export function useCheckbox(): Common & {
  onChange: OnChangeFn;
};
export function useCheckbox<T extends string>(
  ...groupNames: T[]
): Common & {
  onChange: Record<T, OnChangeFn>;
  checkedIdsByGroup: Record<T, Set<string>>;
};
export function useCheckbox<T extends string>(
  ...groupNames: T[]
): Common & {
  onChange: OnChangeFn | Record<T, OnChangeFn>;
  checkedIdsByGroup?: Record<T, Set<string>>;
} {
  const [checkedItemIds, setCheckedItemIds] = useState(new Set<string>());
  const checkedItemIdsRef = useRef(checkedItemIds);
  checkedItemIdsRef.current = checkedItemIds;

  const childrenByItemRef = useRef<Record<string, Set<string> | undefined>>({});
  const groupByItem = useRef<Record<string, string | undefined>>({});
  const parentByItem = useRef<Record<string, string | undefined>>({});
  const allItemsRef = useRef<Set<string>>(new Set());

  const getCheckPartiallyStatus = useCallback(
    (id: string) => {
      const children = Array.from(childrenByItemRef.current[id] ?? []);
      const selfChecked = checkedItemIds.has(id);
      const anyChildChecked = !selfChecked
        ? children.some((child) => checkedItemIds.has(child))
        : true;
      return !selfChecked && anyChildChecked;
    },
    [checkedItemIds]
  );

  const registerRelations = useCallback(
    (item: string, parent?: string, group?: string) => {
      allItemsRef.current.add(item);
      if (group) groupByItem.current[item] = group;
      if (parent) {
        if (!childrenByItemRef.current[parent])
          childrenByItemRef.current[parent] = new Set();
        childrenByItemRef.current[parent]!.add(item);
        parentByItem.current[item] = parent;
      }
    },
    []
  );

  const getUnCheckedAncestors = useCallback((item: string): Set<string> => {
    const uncheckedDescendants = new Set<string>();
    const checkDescendantNewStatusAndPush = (uncheckedItem: string) => {
      const parent = parentByItem.current[uncheckedItem];
      if (!parent) return;
      uncheckedDescendants.add(parent);
      checkDescendantNewStatusAndPush(parent);
    };
    checkDescendantNewStatusAndPush(item);
    return uncheckedDescendants;
  }, []);

  const getChildrenSet = useCallback(
    (item: string) => childrenByItemRef.current[item] ?? new Set<string>(),
    []
  );

  const getAllDescendantsSet = useCallback(
    (item: string): Set<string> => {
      const descendants = new Set<string>();
      const pushChildrenOfItem = (item: string) => {
        getChildrenSet(item).forEach((child) => {
          descendants.add(child);
          pushChildrenOfItem(child);
        });
      };
      pushChildrenOfItem(item);

      return descendants;
    },
    [getChildrenSet]
  );

  const getCheckedAncestorsSet = useCallback((checkedItem: string): Set<
    string
  > => {
    const checkedAncestors = new Set<string>();
    const checkAncestorNewStatusAndPush = (checkedItem: string) => {
      const parent = parentByItem.current[checkedItem];
      if (!parent) return;
      const childrenOfParent = childrenByItemRef.current[parent]!;
      const allChildrenChecked = Array.from(childrenOfParent).every((child) =>
        child === checkedItem ? true : checkedItemIdsRef.current.has(child)
      );
      if (allChildrenChecked) {
        checkedAncestors.add(parent);
        checkAncestorNewStatusAndPush(parent);
      }
    };
    checkAncestorNewStatusAndPush(checkedItem);
    return checkedAncestors;
  }, []);

  const checkItem = useCallback(
    (item: string, parent?: string, group?: string) => {
      setCheckedItemIds((currentState) => {
        const allDescendants = getAllDescendantsSet(item);
        const ancestorsSet = getCheckedAncestorsSet(item);

        const updatedSet = new Set(Array.from(currentState));
        updatedSet.add(item);
        allDescendants.forEach((i) => updatedSet.add(i));
        ancestorsSet.forEach((i) => updatedSet.add(i));
        return updatedSet;
      });
    },
    [getCheckedAncestorsSet, getAllDescendantsSet]
  );

  const uncheckItem = useCallback(
    (item: string, parent?: string, group?: string) => {
      const allDescendants = getAllDescendantsSet(item);
      const uncheckedAncestors = getUnCheckedAncestors(item);

      setCheckedItemIds((currentState) => {
        const updatedSet = new Set(Array.from(currentState));
        updatedSet.delete(item);
        allDescendants.forEach((i) => updatedSet.delete(i));
        uncheckedAncestors.forEach((i) => updatedSet.delete(i));
        return updatedSet;
      });
    },
    [getAllDescendantsSet, getUnCheckedAncestors]
  );

  const handleChangeInternal = useCallback(
    (groupName: string | undefined) => (item: string, parent?: string) => {
      registerRelations(item, parent, groupName);
      return (value: boolean) => {
        if (value) checkItem(item, parent, groupName);
        else uncheckItem(item, parent, groupName);
      };
    },
    [checkItem, registerRelations, uncheckItem]
  );

  const getCheckStatus = useCallback((selfId: string) => {
    return checkedItemIdsRef.current.has(selfId);
  }, []);

  const handleChange: OnChangeFn | Record<T, OnChangeFn> = useMemo(() => {
    if (groupNames.length) {
      const functions = {} as Record<T, OnChangeFn>;
      groupNames.forEach((groupName) => {
        functions[groupName] = handleChangeInternal(groupName);
      });
      return functions;
    }
    return handleChangeInternal("");
  }, [groupNames, handleChangeInternal]);

  const checkedIdsByGroupName = useMemo(() => {
    // TODO Optimize
    const result: Record<string, Set<string>> = {};
    Array.from(checkedItemIds).forEach((item) => {
      const groupName = groupByItem.current[item];
      if (!groupName) return;
      if (!result[groupName]) result[groupName] = new Set();
      result[groupName].add(item);
    });
    return result;
  }, [checkedItemIds]);

  const allChecked =
    !!allItemsRef.current.size &&
    checkedItemIdsRef.current.size === allItemsRef.current.size;

  const toggleAllCheckStatus = useCallback(() => {
    if (allChecked) setCheckedItemIds(new Set());
    else setCheckedItemIds(allItemsRef.current);
  }, [allChecked]);

  useEffect(() => {
    return () => {
      // Cleanup
      allItemsRef.current = new Set<string>();
    };
  });

  return useMemo(
    () => ({
      onChange: handleChange,
      getCheckStatus,
      getCheckPartiallyStatus,
      checkedIds: checkedItemIds,
      onToggleAll: toggleAllCheckStatus,
      allChecked: allChecked,
      ...(groupNames.length
        ? { checkedIdsByGroup: checkedIdsByGroupName }
        : {}),
    }),
    [
      allChecked,
      checkedIdsByGroupName,
      checkedItemIds,
      getCheckPartiallyStatus,
      getCheckStatus,
      groupNames.length,
      handleChange,
      toggleAllCheckStatus,
    ]
  );
}
