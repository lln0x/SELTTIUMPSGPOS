import React, { useState, useCallback } from 'react';
import { ConfirmModal } from '../components/ConfirmModal';

export const useConfirm = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  } | null>(null);

  const confirm = useCallback((
    title: string,
    message: string,
    onConfirm: () => void,
    type: 'danger' | 'warning' | 'info' = 'danger'
  ) => {
    setConfig({ title, message, onConfirm, type });
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  const ConfirmDialog = useCallback(() => (
    <ConfirmModal
      isOpen={isOpen}
      title={config?.title || ''}
      message={config?.message || ''}
      onConfirm={config?.onConfirm || (() => {})}
      onCancel={close}
      type={config?.type}
    />
  ), [isOpen, config, close]);

  return { confirm, ConfirmDialog };
};
