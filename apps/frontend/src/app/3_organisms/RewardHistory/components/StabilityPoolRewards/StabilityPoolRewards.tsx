import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';

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
  Select,
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
import { useMaintenance } from '../../../../../hooks/useMaintenance';
import { translations } from '../../../../../locales/i18n';
import { zeroClient } from '../../../../../utils/clients';
import {
  StabilityDepositChange,
  StabilityDepositChange_Filter,
  StabilityDepositChange_OrderBy,
  useGetStabilityDepositChangesLazyQuery,
} from '../../../../../utils/graphql/zero/generated';
import { dateFormat } from '../../../../../utils/helpers';
import { RewardHistoryProps } from '../../types';
import { rewardHistoryOptions } from '../../utils';
import { useGetStabilityPoolRewards } from './hooks/useGetStabilityPoolRewards';
import { getTransactionType, renderCollateralChange } from './utils';

const pageSize = DEFAULT_HISTORY_FRAME_PAGE_SIZE;

const generateRowTitle = (row: StabilityDepositChange) => (
  <Paragraph size={ParagraphSize.small} className="text-left">
    {getTransactionType(row.stabilityDepositOperation)}
    {' - '}
    {dateFormat(row.transaction.timestamp)}
  </Paragraph>
);

export const StabilityPoolRewards: FC<RewardHistoryProps> = ({
  selectedHistoryType,
  onChangeRewardHistory,
}) => {
  const { account } = useAccount();
  const { addNotification } = useNotificationContext();

  const [page, setPage] = useState(0);
  const chain = chains.find(chain => chain.id === defaultChainId);

  const [orderOptions, setOrderOptions] = useState<OrderOptions>({
    orderBy: 'sequenceNumber',
    orderDirection: OrderDirection.Desc,
  });

  const { data, loading } = useGetStabilityPoolRewards(
    account,
    pageSize,
    page,
    orderOptions,
  );
  const [getStabilityDeposit] = useGetStabilityDepositChangesLazyQuery({
    client: zeroClient,
  });

  const columns = useMemo(
    () => [
      {
        id: 'sequenceNumber',
        title: t(translations.common.tables.columnTitles.timestamp),
        cellRenderer: (tx: StabilityDepositChange) =>
          dateFormat(tx.transaction.timestamp),
        sortable: true,
      },
      {
        id: 'stabilityDepositOperation',
        title: t(translations.common.tables.columnTitles.transactionType),
        cellRenderer: (tx: StabilityDepositChange) => (
          <>{getTransactionType(tx.stabilityDepositOperation)}</>
        ),
      },
      {
        id: 'collateralGain',
        title: t(translations.common.tables.columnTitles.amount),
        cellRenderer: tx => (
          <AmountRenderer
            value={tx.collateralGain || 0}
            suffix={BITCOIN}
            precision={BTC_RENDER_PRECISION}
            dataAttribute="reward-history-collateral-gain"
          />
        ),
      },
      {
        id: 'transactionID',
        title: t(translations.common.tables.columnTitles.transactionID),
        cellRenderer: (tx: StabilityDepositChange) => (
          <TxIdWithNotification
            href={`${chain?.blockExplorerUrl}/tx/${tx.transaction.id}`}
            value={tx.transaction.id}
            dataAttribute="reward-history-address-id"
          />
        ),
      },
    ],
    [chain?.blockExplorerUrl],
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
    const { data } = await getStabilityDeposit({
      variables: {
        skip: 0,
        filters: {
          stabilityDepositOperation_in: [
            'withdrawGainToLineOfCredit',
            'withdrawCollateralGain',
          ],
          stabilityDeposit: account,
        } as StabilityDepositChange_Filter,
        pageSize: EXPORT_RECORD_LIMIT,
        orderBy: StabilityDepositChange_OrderBy.BlockNumber,
        orderDirection: OrderDirection.Desc,
      },
    });
    let list = data?.stabilityDepositChanges || [];

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
      collateralGain: renderCollateralChange(tx.collateralGain || ''),
      stabilityDepositOperation: getTransactionType(
        tx.stabilityDepositOperation,
      ),
      transactionID: tx.transaction.id,
    }));
  }, [account, addNotification, getStabilityDeposit]);

  useEffect(() => {
    setPage(0);
  }, [orderOptions]);

  const { checkMaintenance, States } = useMaintenance();
  const exportLocked = checkMaintenance(States.ZERO_EXPORT_CSV);

  return (
    <>
      <div className="flex-row items-center gap-4 mb-7 flex justify-center lg:justify-start">
        <Select
          dataAttribute={`reward-history-${selectedHistoryType}`}
          value={selectedHistoryType}
          onChange={onChangeRewardHistory}
          options={rewardHistoryOptions}
        />
        <div className="flex-row items-center ml-2 gap-4 hidden lg:inline-flex">
          <ExportCSV
            getData={exportData}
            filename="stability-pool-rewards"
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
          dataAttribute="reward-history-table"
        />
        <Pagination
          page={page}
          className="lg:pb-6 mt-3 lg:mt-6 justify-center lg:justify-start"
          onChange={onPageChange}
          itemsPerPage={pageSize}
          isNextButtonDisabled={isNextButtonDisabled}
          dataAttribute="reward-history-pagination"
        />
      </div>
    </>
  );
};
