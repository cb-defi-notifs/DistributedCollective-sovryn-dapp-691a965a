import React, {
  FC,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { t } from 'i18next';
import { nanoid } from 'nanoid';

import {
  ErrorBadge,
  ErrorLevel,
  NotificationType,
  OrderDirection,
  OrderOptions,
  Pagination,
  Paragraph,
  ParagraphSize,
  Table,
} from '@sovryn/ui';

import { chains, defaultChainId } from '../../../../../config/chains';

import { AmountRenderer } from '../../../../2_molecules/AmountRenderer/AmountRenderer';
import { ExportCSV } from '../../../../2_molecules/ExportCSV/ExportCSV';
import { TxIdWithNotification } from '../../../../2_molecules/TxIdWithNotification/TransactionIdWithNotification';
import {
  BITCOIN,
  BTC_RENDER_PRECISION,
} from '../../../../../constants/currencies';
import {
  DEFAULT_HISTORY_FRAME_PAGE_SIZE,
  EXPORT_RECORD_LIMIT,
} from '../../../../../constants/general';
import { useNotificationContext } from '../../../../../contexts/NotificationContext';
import { useAccount } from '../../../../../hooks/useAccount';
import { useBlockNumber } from '../../../../../hooks/useBlockNumber';
import { useMaintenance } from '../../../../../hooks/useMaintenance';
import { translations } from '../../../../../locales/i18n';
import { zeroClient } from '../../../../../utils/clients';
import {
  CollSurplusChange_Filter,
  useGetCollSurplusChangesLazyQuery,
} from '../../../../../utils/graphql/zero/generated';
import { dateFormat } from '../../../../../utils/helpers';
import { formatValue } from '../../../../../utils/math';
import { useGetCollateralSurplusWithdrawals } from './hooks/useGetCollateralSurplusWithdrawals';

const pageSize = DEFAULT_HISTORY_FRAME_PAGE_SIZE;

export const CollateralSurplusHistoryFrame: FC<PropsWithChildren> = ({
  children,
}) => {
  const { account } = useAccount();
  const { addNotification } = useNotificationContext();

  const [page, setPage] = useState(0);
  const chain = chains.find(chain => chain.id === defaultChainId);

  const { value: block } = useBlockNumber();

  const [orderOptions, setOrderOptions] = useState<OrderOptions>({
    orderBy: 'sequenceNumber',
    orderDirection: OrderDirection.Desc,
  });

  const { data, loading, refetch } = useGetCollateralSurplusWithdrawals(
    account,
    pageSize,
    page,
    orderOptions,
  );

  useEffect(() => {
    refetch();
  }, [refetch, block]);

  const [getCollSurplusChanges] = useGetCollSurplusChangesLazyQuery({
    client: zeroClient,
  });

  const renderCollateralChange = useCallback(
    (collSurplusChange: string) => (
      <AmountRenderer
        value={collSurplusChange}
        suffix={BITCOIN}
        precision={BTC_RENDER_PRECISION}
        dataAttribute="surplus-withdrawals-collateral"
      />
    ),
    [],
  );

  const generateRowTitle = useCallback(
    (row: any) => (
      <Paragraph size={ParagraphSize.small} className="text-left">
        {t(translations.collateralSurplusHistory.table.withdrawSurplus)}
        {' - '}
        {dateFormat(row.timestamp)}
      </Paragraph>
    ),
    [],
  );

  const columns = useMemo(
    () => [
      {
        id: 'sequenceNumber',
        title: t(translations.common.tables.columnTitles.timestamp),
        cellRenderer: (tx: any) => dateFormat(tx.timestamp),
        sortable: true,
      },
      {
        id: 'withdrawSurplus',
        title: t(translations.common.tables.columnTitles.transactionType),
        cellRenderer: () =>
          t(translations.collateralSurplusHistory.table.withdrawSurplus),
      },
      {
        id: 'collSurplusChange',
        title: t(translations.collateralSurplusHistory.table.amount),
        cellRenderer: tx => renderCollateralChange(tx.collSurplusChange),
      },
      {
        id: 'transactionID',
        title: t(translations.common.tables.columnTitles.transactionID),
        cellRenderer: (tx: any) => (
          <TxIdWithNotification
            href={`${chain?.blockExplorerUrl}/tx/${tx.hash}`}
            value={tx.hash}
            dataAttribute="history-address-id"
          />
        ),
      },
    ],
    [chain?.blockExplorerUrl, renderCollateralChange],
  );

  const onPageChange = useCallback(
    (value: number) => {
      if (data?.length < pageSize && value > page) {
        return;
      }
      setPage(value);
    },
    [page, data],
  );

  const isNextButtonDisabled = useMemo(
    () => !loading && data?.length < pageSize,
    [loading, data],
  );

  const exportData = useCallback(async () => {
    const { data } = await getCollSurplusChanges({
      variables: {
        skip: 0,
        filters: {
          user_contains: account || '',
          collSurplusAfter: '0',
        } as CollSurplusChange_Filter,
        pageSize: EXPORT_RECORD_LIMIT,
      },
    });
    let list = data?.collSurplusChanges || [];

    if (!list || !list.length) {
      addNotification({
        type: NotificationType.warning,
        title: t(translations.common.tables.actions.noDataToExport),
        content: '',
        dismissible: true,
        id: nanoid(),
      });
    }

    return list.map(tx => ({
      timestamp: dateFormat(tx.transaction.timestamp),
      collateralChange: `${formatValue(
        Math.abs(Number(tx.collSurplusChange)),
        BTC_RENDER_PRECISION,
      )} ${BITCOIN}`,
      transactionType: t(
        translations.collateralSurplusHistory.table.withdrawSurplus,
      ),
      transactionID: tx.transaction.id,
    }));
  }, [account, addNotification, getCollSurplusChanges]);

  useEffect(() => {
    setPage(0);
  }, [orderOptions]);

  const { checkMaintenance, States } = useMaintenance();
  const exportLocked = checkMaintenance(States.ZERO_EXPORT_CSV);

  return (
    <>
      <div className="flex-row items-center gap-4 mb-7 flex justify-center lg:justify-start">
        {children}
        <div className="flex-row items-center ml-2 gap-4 hidden lg:inline-flex">
          <ExportCSV
            getData={exportData}
            filename="collateral surplus withdrawals"
            disabled={!data || data.length === 0 || exportLocked}
          />
          {exportLocked && (
            <ErrorBadge
              level={ErrorLevel.Warning}
              message={t(translations.maintenanceMode.featureDisabled)}
            />
          )}
        </div>
      </div>
      <div className="bg-gray-80 py-4 px-4 rounded">
        <Table
          setOrderOptions={setOrderOptions}
          orderOptions={orderOptions}
          columns={columns}
          rows={data}
          rowTitle={generateRowTitle}
          isLoading={loading}
          className="bg-gray-80 text-gray-10 lg:px-6 lg:py-4"
          noData={t(translations.common.tables.noData)}
          dataAttribute="surplus-withdrawals-table"
        />
        <Pagination
          page={page}
          className="lg:pb-6 mt-3 lg:mt-6 justify-center lg:justify-start"
          onChange={onPageChange}
          itemsPerPage={pageSize}
          isNextButtonDisabled={isNextButtonDisabled}
          dataAttribute="surplus-withdrawals-pagination"
        />
      </div>
    </>
  );
};
