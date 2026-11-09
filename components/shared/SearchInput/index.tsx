"use client";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/components/ui/field";

import { memo, useEffect, useId, useRef, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { searchSchema } from "@/services/schemas";

export const SearchInput = memo(function SearchInput({
  value,
  onSearch,
  navigationKey,
  loading = false,
  extraTools,
}: {
  value: string;
  onSearch: (value: string) => void;
  navigationKey: string;
  loading?: boolean;
  extraTools?: ReactNode;
}) {
  const t = useTranslations();
  const id = useId();
  const { register, reset, handleSubmit } = useForm({
    resolver: yupResolver(searchSchema),
    defaultValues: { search: value },
  });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onSearchRef = useRef(onSearch);

  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);
  useEffect(() => {
    // URL đổi do Back/Forward hoặc phân trang thì bỏ từ khóa nháp và timer cũ.
    clearTimeout(timer.current);
    reset({ search: value });
    return () => clearTimeout(timer.current);
  }, [value, navigationKey, reset]);

  const submit = () => {
    if (loading) return;
    clearTimeout(timer.current);
    void handleSubmit(({ search }) => onSearchRef.current(search))();
  };
  const searchField = register("search");
  return (
    <form
      className={`cms-search${extraTools ? " cms-search--withTools" : ""}`}
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <FieldLabel htmlFor={id} className="visually-hidden">
        {t("common.search")}
      </FieldLabel>
      <Input
        id={id}
        type="search"
        placeholder={t("common.searchPlaceholder")}
        {...searchField}
        onChange={(event) => {
          void searchField.onChange(event);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            void handleSubmit(({ search }) => onSearchRef.current(search))();
          }, 350);
        }}
      />
      {extraTools}
      <Button variant="primary" className="h-10" type="submit" aria-label={t("common.search")} loading={loading}>
        {t("common.search")}
      </Button>
    </form>
  );
});
