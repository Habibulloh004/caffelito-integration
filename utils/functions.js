function formatCustomDate(dateString) {
  const monthsRu = [
    'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
    'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'
  ];

  const date = new Date(dateString);
  const year = date.getFullYear();
  const day = String(date.getDate()).padStart(2, '0');
  const month = monthsRu[date.getMonth()];
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day} ${month} ${hours}:${minutes}`;
}

function formatSupplySum(sum) {
  if (typeof sum !== 'number') return 'Noto‘g‘ri qiymat';
  const divided = sum / 100;
  return divided.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

module.exports = { formatCustomDate, formatSupplySum };