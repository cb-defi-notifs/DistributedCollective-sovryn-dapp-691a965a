import React, { FC, PropsWithChildren, useCallback, useState } from 'react';

import { t } from 'i18next';
import { nanoid } from 'nanoid';
import { Link } from 'react-router-dom';

import {
  Button,
  Menu,
  MenuItem,
  NotificationType,
  WalletIdentity,
} from '@sovryn/ui';

import { EmailNotificationSettingsDialog } from '../../3_organisms/EmailNotificationSettingsDialog/EmailNotificationSettingsDialog';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import { translations } from '../../../locales/i18n';

export type ConnectWalletButtonProps = {
  onConnect: () => void;
  onDisconnect: () => void;
  address: string | undefined;
  pending?: boolean;
  className?: string;
  dataAttribute?: string;
};

export const ConnectWalletButton: FC<
  PropsWithChildren<ConnectWalletButtonProps>
> = ({
  address,
  pending,
  onDisconnect,
  onConnect,
  className,
  dataAttribute,
}) => {
  const [open, setOpen] = useState(false);
  const { addNotification } = useNotificationContext();

  const onCopyAddress = useCallback(() => {
    addNotification({
      type: NotificationType.success,
      title: t(translations.copyAddress),
      content: '',
      dismissible: true,
      id: nanoid(),
    });
  }, [addNotification]);

  if (!address) {
    return (
      <Button
        text={t(translations.connectWalletButton.connect)}
        onClick={onConnect}
        className={className}
        dataAttribute={dataAttribute}
        disabled={pending}
      />
    );
  } else {
    return (
      <>
        <WalletIdentity
          onDisconnect={onDisconnect}
          onCopyAddress={onCopyAddress}
          address={address}
          dataAttribute={dataAttribute}
          className={className}
          content={
            <Menu className="mb-4">
              <Link to="/rewards" className="no-underline">
                <MenuItem
                  text={t(translations.connectWalletButton.rewards)}
                  className="no-underline"
                  dataAttribute={`${dataAttribute}-menu-rewards`}
                />
              </Link>
              <Link to="/history" className="no-underline">
                <MenuItem
                  text={t(translations.connectWalletButton.history)}
                  dataAttribute={`${dataAttribute}-menu-history`}
                />
              </Link>
              <MenuItem
                text={t(translations.connectWalletButton.settings)}
                onClick={() => setOpen(true)}
                dataAttribute={`${dataAttribute}-menu-settings`}
              />
            </Menu>
          }
          submenuLabels={{
            copyAddress: t(translations.connectWalletButton.copyAddress),
            disconnect: t(translations.connectWalletButton.disconnect),
          }}
        />
        <EmailNotificationSettingsDialog
          isOpen={open}
          onClose={() => setOpen(false)}
        />
      </>
    );
  }
};
