"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Select as SelectPrimitive } from "radix-ui"
import { ChevronDownIcon, CheckIcon, ChevronUpIcon } from "lucide-react"
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  useComboboxAnchor,
} from "@/components/ui/combobox"

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectLabels {
  empty?: string;
  toggle?: string;
  clear?: string;
  remove?: (label: string) => string;
}

type MultipleSelectMode = true | { allowClear: boolean };

interface SharedSelectProps {
  options: SelectOption[];
  popupClassName?: string;
  className?: string;
}

type SingleSelectProps = SharedSelectProps &
  Omit<
    React.ComponentProps<typeof SelectTrigger>,
    "children" | "value" | "defaultValue" | "onChange"
  > & {
    multiple?: false;
    value: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
  };

type MultipleSelectProps = SharedSelectProps &
  Omit<
    React.ComponentProps<typeof ComboboxChipsInput>,
    "value" | "defaultValue" | "onChange" | "multiple" | "className"
  > & {
    multiple: MultipleSelectMode;
    value: string[];
    onValueChange: (value: string[]) => void;
    labels?: SelectLabels;
  };

export type SelectProps = SingleSelectProps | MultipleSelectProps;

function Select(props: SelectProps) {
  if (props.multiple) return <MultipleSelect {...props} />;

  const {
    multiple,
    value,
    onValueChange,
    options,
    placeholder,
    disabled,
    name,
    popupClassName,
    ...triggerProps
  } = props;

  return (
    <SelectPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      name={name}
    >
      <SelectTrigger {...triggerProps} data-multiple={multiple ?? false}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={popupClassName} position="popper" align="start">
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </SelectPrimitive.Root>
  );
}

function MultipleSelect({
  multiple,
  value,
  onValueChange,
  options,
  disabled = false,
  placeholder = "Select…",
  className,
  popupClassName,
  labels,
  name,
  ...inputProps
}: MultipleSelectProps) {
  const anchor = useComboboxAnchor();
  const [search, setSearch] = React.useState("");
  const allowClear = typeof multiple === "object" && multiple.allowClear;
  const selected = value.map(
    (item) =>
      options.find((option) => option.value === item) ?? {
        value: item,
        label: item,
      },
  );

  return (
    <Combobox
      multiple
      modal={false}
      name={name}
      items={options}
      value={selected}
      inputValue={search}
      onInputValueChange={setSearch}
      onValueChange={(items) => {
        if (disabled) return;
        onValueChange(items.map((item) => item.value));
        setSearch("");
      }}
      onOpenChange={(open, details) => {
        // Giữ danh sách mở sau khi chọn kết quả tìm kiếm để người dùng chọn tiếp.
        if (!open && details.reason === "item-press") details.cancel();
        else if (!open) setSearch("");
      }}
      isItemEqualToValue={(item, selected) => item.value === selected.value}
      disabled={disabled}
    >
      <ComboboxChips
        ref={anchor}
        className={className}
        data-multiple
        data-disabled={disabled || undefined}
      >
        {selected.map((option) => (
          <ComboboxChip
            key={option.value}
            showRemove={!disabled}
            removeLabel={labels?.remove?.(option.label) ?? `Remove ${option.label}`}
          >
            <span data-slot="combobox-chip-label">{option.label}</span>
          </ComboboxChip>
        ))}
        <ComboboxChipsInput
          {...inputProps}
          disabled={disabled}
          placeholder={value.length ? undefined : placeholder}
        />
        {allowClear && value.length > 0 && !disabled && (
          <ComboboxClear
            disabled={disabled}
            tabIndex={0}
            aria-label={labels?.clear ?? "Clear selections"}
            className="size-7 border-0 p-0 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
        )}
        <ComboboxTrigger
          disabled={disabled}
          aria-label={labels?.toggle ?? "Toggle options"}
          className="ml-auto flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground"
        />
      </ComboboxChips>
      <ComboboxContent anchor={anchor} className={popupClassName}>
        <ComboboxEmpty>{labels?.empty ?? "No options found."}</ComboboxEmpty>
        <ComboboxList>
          {(option: SelectOption) => (
            <ComboboxItem
              key={option.value}
              value={option}
              disabled={disabled || option.disabled}
            >
              {option.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

function SelectGroup({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("scroll-my-1 p-1", className)}
      {...props}
    />
  )
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "default"
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "flex w-fit cursor-pointer items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground data-[size=default]:h-8 data-[size=sm]:h-7 data-[size=sm]:rounded-[min(var(--radius-md),10px)] *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  position = "item-aligned",
  align = "center",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        data-align-trigger={position === "item-aligned"}
        className={cn("relative z-50 max-h-(--radix-select-content-available-height) min-w-36 origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[align-trigger=true]:animate-none data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95", position ==="popper"&&"data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1", className )}
        position={position}
        align={align}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          data-slot="select-viewport"
          data-position={position}
          className={cn(
            "scroll-py-1 p-1 data-[position=popper]:h-(--radix-select-trigger-height) data-[position=popper]:w-full data-[position=popper]:min-w-(--radix-select-trigger-width)",
            position === "popper" && ""
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn("px-1.5 py-1 text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-pointer items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className
      )}
      {...props}
    >
      <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="pointer-events-none" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("pointer-events-none -mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        "z-10 flex cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <ChevronUpIcon
      />
    </SelectPrimitive.ScrollUpButton>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        "z-10 flex cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <ChevronDownIcon
      />
    </SelectPrimitive.ScrollDownButton>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
