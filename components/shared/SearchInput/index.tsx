"use client";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { useEffect, useId, useRef } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { searchSchema } from "@/services/schemas";

export function SearchInput({
  value,
  onSearch,
  navigationKey,
}: {
  value: string;
  onSearch: (value: string) => void;
  navigationKey: string;
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
    clearTimeout(timer.current);
    void handleSubmit(({ search }) => onSearchRef.current(search))();
  };
  const searchField = register("search");
  return (
    <form
      className="Cms-search"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <label htmlFor={id} className="visually-hidden">
        {t("common.search")}
      </label>
      <Input
        id={id}
        type="search"
        maxLength={200}
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
      <Button variant="primary" className="h-10" type="submit">{t("common.search")}</Button>
    </form>
  );
}
