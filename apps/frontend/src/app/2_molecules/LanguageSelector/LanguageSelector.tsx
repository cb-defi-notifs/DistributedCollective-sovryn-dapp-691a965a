import React, { FC, useCallback, useState } from 'react';

import i18next from 'i18next';
import { reactLocalStorage } from 'reactjs-localstorage';

import { Menu, MenuItem, Dropdown, DropdownSize } from '@sovryn/ui';

import { languages, languageLocalStorageKey } from '../../../locales/i18n';
import styles from './LanguageSelector.module.css';

type LanguageSelectorProps = {
  className?: string;
  dataAttribute?: string;
};

export const LanguageSelector: FC<LanguageSelectorProps> = ({
  className,
  dataAttribute,
}) => {
  const [currentLang, setCurrentLang] = useState(
    i18next.language || reactLocalStorage.get('i18nextLng'),
  );

  const changeLanguage = useCallback(
    (language: string) => () => {
      i18next.changeLanguage(language);
      reactLocalStorage.set(languageLocalStorageKey, language);
      setCurrentLang(language);
    },
    [],
  );

  return (
    <Dropdown
      text={currentLang.toUpperCase()}
      className={className}
      dataAttribute={dataAttribute}
      size={DropdownSize.small}
      closeOnClick
    >
      <Menu className={styles.menu}>
        {languages.map(language => (
          <MenuItem
            isActive={currentLang === language}
            text={language.toUpperCase()}
            onClick={changeLanguage(language)}
            key={language}
          />
        ))}
      </Menu>
    </Dropdown>
  );
};
