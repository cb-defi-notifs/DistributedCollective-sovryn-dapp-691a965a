import React, { FC } from 'react';

import { t } from 'i18next';

import { Heading, HealthBar, HeadingType } from '@sovryn/ui';
import { Decimal } from '@sovryn/utils';

import { translations } from '../../../locales/i18n';

export type CollateralRatioProps = {
  value?: Decimal;
};

export const CollateralRatio: FC<CollateralRatioProps> = ({ value }) => {
  return (
    <div className="w-80">
      <div className="flex items-center justify-between mb-3">
        <Heading
          className="text-gray-10 flex items-center"
          type={HeadingType.h3}
        >
          {t(translations.collateralRatio.title)}
        </Heading>
        <Heading
          className="text-gray-30 flex items-center"
          type={HeadingType.h3}
        >
          {value !== undefined ? `${value}%` : 'N/A'}
        </Heading>
      </div>
      <HealthBar
        start={90}
        middleStart={110}
        middleEnd={150}
        end={250}
        value={value?.toNumber()}
      />
    </div>
  );
};
