import { useCallback, useState } from 'react';

export function useConfirm() {
  const [state, setState] = useState({ open: false, options: null, resolver: null });

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setState({ open: true, options, resolver: resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state.resolver?.(true);
    setState({ open: false, options: null, resolver: null });
  }, [state.resolver]);

  const handleCancel = useCallback(() => {
    state.resolver?.(false);
    setState({ open: false, options: null, resolver: null });
  }, [state.resolver]);

  return {
    confirm,
    dialogProps: {
      open: state.open,
      onConfirm: handleConfirm,
      onCancel: handleCancel,
      ...(state.options || {}),
    },
  };
}
