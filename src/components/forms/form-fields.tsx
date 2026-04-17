import type { ComponentProps, ReactNode } from "react";
import {
  Controller,
  type FieldError,
  type FieldValues,
  type Path,
  type RegisterOptions,
  get,
  useFormContext,
} from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValueFromOptions,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatInternationalPhoneInput, phoneExample } from "@/lib/phone";
import { emailRules, phoneRules } from "@/lib/validation";
import { cn } from "@/lib/utils";

type BaseFieldProps<T extends FieldValues> = {
  name: Path<T>;
  label: string;
  helper?: ReactNode;
  rules?: RegisterOptions;
};

type FormInputProps<T extends FieldValues> = BaseFieldProps<T> &
  Omit<ComponentProps<typeof Input>, "defaultValue" | "name" | "value"> & {
    formatValue?: (value: string) => string;
    parseValue?: (value: string) => unknown;
  };

type FormTextareaProps<T extends FieldValues> = BaseFieldProps<T> &
  Omit<ComponentProps<typeof Textarea>, "defaultValue" | "name" | "value">;

type FormSelectOption = {
  label: ReactNode;
  value: string;
  disabled?: boolean;
};

type FormSelectProps<T extends FieldValues> = BaseFieldProps<T> & {
  options: FormSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  triggerClassName?: string;
};

type FormCheckboxProps<T extends FieldValues> = Omit<
  BaseFieldProps<T>,
  "helper"
> & {
  description?: ReactNode;
  className?: string;
  checkboxClassName?: string;
  disabled?: boolean;
};

function fieldError<T extends FieldValues>(errors: T, name: string) {
  return get(errors, name) as FieldError | undefined;
}

function FieldMessage({
  error,
  helper,
}: {
  error?: FieldError;
  helper?: ReactNode;
}) {
  if (error?.message) {
    return <p className="text-xs text-destructive">{error.message}</p>;
  }

  if (helper) {
    return <p className="text-xs text-muted-foreground">{helper}</p>;
  }

  return null;
}

export function FormInput<T extends FieldValues>({
  name,
  label,
  helper,
  rules,
  formatValue,
  parseValue,
  id,
  onChange,
  ...props
}: FormInputProps<T>) {
  const {
    control,
    formState: { errors },
  } = useFormContext<T>();
  const error = fieldError(errors, name);
  const inputId = id ?? name;

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <Controller
        control={control}
        name={name}
        rules={rules as RegisterOptions<T, Path<T>> | undefined}
        render={({ field }) => (
          <Input
            id={inputId}
            aria-invalid={Boolean(error)}
            {...props}
            ref={field.ref}
            name={field.name}
            value={field.value ?? ""}
            onBlur={field.onBlur}
            onChange={(event) => {
              const value = formatValue
                ? formatValue(event.target.value)
                : event.target.value;
              field.onChange(parseValue ? parseValue(value) : value);
              onChange?.(event);
            }}
          />
        )}
      />
      <FieldMessage error={error} helper={helper} />
    </div>
  );
}

export function FormTextarea<T extends FieldValues>({
  name,
  label,
  helper,
  rules,
  id,
  onChange,
  ...props
}: FormTextareaProps<T>) {
  const {
    control,
    formState: { errors },
  } = useFormContext<T>();
  const error = fieldError(errors, name);
  const textareaId = id ?? name;

  return (
    <div className="space-y-2">
      <Label htmlFor={textareaId}>{label}</Label>
      <Controller
        control={control}
        name={name}
        rules={rules as RegisterOptions<T, Path<T>> | undefined}
        render={({ field }) => (
          <Textarea
            id={textareaId}
            aria-invalid={Boolean(error)}
            {...props}
            ref={field.ref}
            name={field.name}
            value={field.value ?? ""}
            onBlur={field.onBlur}
            onChange={(event) => {
              field.onChange(event.target.value);
              onChange?.(event);
            }}
          />
        )}
      />
      <FieldMessage error={error} helper={helper} />
    </div>
  );
}

export function FormSelect<T extends FieldValues>({
  name,
  label,
  helper,
  rules,
  options,
  placeholder = "Selecione",
  disabled,
  triggerClassName,
}: FormSelectProps<T>) {
  const {
    control,
    formState: { errors },
  } = useFormContext<T>();
  const error = fieldError(errors, name);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Controller
        control={control}
        name={name}
        rules={rules as RegisterOptions<T, Path<T>> | undefined}
        render={({ field }) => (
          <Select
            value={field.value ?? ""}
            onValueChange={(value) => field.onChange(value ?? "")}
          >
            <SelectTrigger
              aria-invalid={Boolean(error)}
              disabled={disabled}
              className={triggerClassName}
            >
              <SelectValueFromOptions
                placeholder={placeholder}
                options={options}
                value={field.value ?? ""}
              />
            </SelectTrigger>
            <SelectContent>
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
          </Select>
        )}
      />
      <FieldMessage error={error} helper={helper} />
    </div>
  );
}

export function FormCheckbox<T extends FieldValues>({
  name,
  label,
  description,
  rules,
  className,
  checkboxClassName,
  disabled,
}: FormCheckboxProps<T>) {
  const {
    control,
    formState: { errors },
  } = useFormContext<T>();
  const error = fieldError(errors, name);

  return (
    <div className={cn("rounded-2xl border border-border/60 bg-background/70 p-4", className)}>
      <label className="flex items-start gap-3 text-sm text-muted-foreground">
        <Controller
          control={control}
          name={name}
          rules={rules as RegisterOptions<T, Path<T>> | undefined}
          render={({ field }) => (
            <Checkbox
              checked={field.value === true}
              disabled={disabled}
              aria-invalid={Boolean(error)}
              onCheckedChange={(checked) => field.onChange(checked === true)}
              className={cn("mt-0.5", checkboxClassName)}
            />
          )}
        />
        <span>
          <span className="text-foreground">{label}</span>
          {description ? (
            <span className="block text-muted-foreground">{description}</span>
          ) : null}
        </span>
      </label>
      <FieldMessage error={error} />
    </div>
  );
}

export function FormEmailInput<T extends FieldValues>({
  rules,
  ...props
}: Omit<FormInputProps<T>, "type">) {
  return <FormInput {...props} type="email" rules={rules ?? emailRules()} />;
}

export function FormPhoneInput<T extends FieldValues>({
  helper = <>Use DDI, DDD e número. Exemplo: {phoneExample}.</>,
  rules,
  ...props
}: Omit<FormInputProps<T>, "inputMode" | "placeholder" | "formatValue">) {
  return (
    <FormInput
      {...props}
      inputMode="tel"
      placeholder={phoneExample}
      helper={helper}
      rules={rules ?? phoneRules()}
      formatValue={formatInternationalPhoneInput}
    />
  );
}
