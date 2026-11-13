"use client";

import { Modal as ModalComponent } from "./Modal";
import { useModal } from "./useModal";

export const Modal = Object.assign(ModalComponent, { useModal });

export { useModal };
export type { ModalProps } from "./Modal";
export type { ModalConfig, ModalInstance, ModalApi, ModalUpdate } from "./useModal";
