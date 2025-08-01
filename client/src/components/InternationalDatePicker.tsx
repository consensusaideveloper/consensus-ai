import React from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import ja from 'date-fns/locale/ja';
import enUS from 'date-fns/locale/en-US';
import { useLanguage } from '../hooks/useLanguage';
import 'react-datepicker/dist/react-datepicker.css';
import './InternationalDatePicker.css';

// ロケール登録
registerLocale('ja', ja);
registerLocale('en', enUS);

interface InternationalDatePickerProps {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  className?: string;
  placeholderText?: string;
}

export const InternationalDatePicker: React.FC<InternationalDatePickerProps> = ({
  selected,
  onChange,
  className = '',
  placeholderText,
}) => {
  const { language } = useLanguage();
  const locale = language === 'ja' ? 'ja' : 'en';
  
  // 日付フォーマット
  const dateFormat = language === 'ja' ? 'yyyy年MM月dd日' : 'MM/dd/yyyy';
  
  return (
    <DatePicker
      selected={selected}
      onChange={onChange}
      locale={locale}
      dateFormat={dateFormat}
      placeholderText={placeholderText}
      className={`international-date-picker ${className}`}
      calendarClassName="international-date-picker-calendar"
      showMonthDropdown
      showYearDropdown
      dropdownMode="select"
    />
  );
};