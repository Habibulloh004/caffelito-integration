document.addEventListener("DOMContentLoaded", () => {
    // Fix: Create separate date objects for each range
    const today = new Date();
    const quickRanges = {
      today: {
        label: "Сегодня",
        from: new Date(today),
        to: new Date(today),
      },
      yesterday: {
        label: "Вчера",
        from: new Date(today.getTime() - 24 * 60 * 60 * 1000),
        to: new Date(today.getTime() - 24 * 60 * 60 * 1000),
      },
      last7Days: {
        label: "Последняя неделя",
        from: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000),
        to: new Date(today),
      },
      last30Days: {
        label: "Последний месяц",
        from: new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000),
        to: new Date(today),
      },
    };
  
    const calendarToggle = document.getElementById("calendar-toggle");
    const dateRangeInput = document.getElementById("date-range");
    const exportButton = document.getElementById("export-button");
    const errorMessage = document.getElementById("error-message");
    const loading = document.getElementById("loading");
  
    let token = "619530:17786816d3f367cc8297bf71e9275e9d";
    let productsData = [];
    let ingredientsData = [];
    let storesData = [];
    let workersData = [];
  
    // Flatpickr sozlash
    const fp = flatpickr(dateRangeInput, {
      mode: "range",
      dateFormat: "Y-m-d",
      locale: "ru",
      onChange: (selectedDates) => {
        if (selectedDates.length === 2) {
          calendarToggle.textContent = `📅 ${formatDate(
            selectedDates[0]
          )} - ${formatDate(selectedDates[1])}`;
        }
      },
    });
  
    // Sana formatlash
    function formatDate(date) {
      const months = [
        "январь",
        "февраль",
        "март",
        "апрель",
        "май",
        "июнь",
        "июль",
        "август",
        "сентябрь",
        "октябрь",
        "ноябрь",
        "декабрь",
      ];
      return `${date.getDate().toString().padStart(2, "0")}.${(
        date.getMonth() + 1
      )
        .toString()
        .padStart(2, "0")}.${date.getFullYear()}`;
    }
  
    function formatCustomDate(dateString) {
      // Replace space with 'T' to make it ISO compatible
      const date = new Date(dateString.replace(" ", "T"));
  
      // Add 2 hours
      date.setHours(date.getHours() + 2);
  
      // Format components with leading zeros
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
  
      return `${day}.${month}.${year},${hours}:${minutes}`;
    }
  
    function formatSupplySum(sum, div = true) {
      if (typeof sum !== "number") return 0;
      const divided = div ? sum / 100 : sum;
      return Number(divided.toFixed(2)); // return as number
    }
  
    // Kalendar ochish/yopish
    calendarToggle.addEventListener("click", () => {
      fp.toggle();
    });
  
    // Quick ranges tugmalari
    const quickRangesContainer = document.createElement("div");
    quickRangesContainer.className = "quick-ranges";
    Object.entries(quickRanges).forEach(([key, { label, from, to }]) => {
      const button = document.createElement("button");
      button.textContent = label;
      button.className = "quick-range-button";
      button.addEventListener("click", () => {
        // Create fresh date objects when setting
        const fromDate = new Date(from);
        const toDate = new Date(to);
        fp.setDate([fromDate, toDate]);
        calendarToggle.textContent = `📅 ${formatDate(fromDate)} - ${formatDate(
          toDate
        )}`;
      });
      quickRangesContainer.appendChild(button);
    });
    calendarToggle.parentElement.appendChild(quickRangesContainer);
  
    // Token olish
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    if (code) {
      axios
        .get(`/api/token?code=${code}`)
        .then((response) => {
          if (response.data.token) {
            token = response.data.token;
            fetchInitialData();
          } else {
            errorMessage.textContent = "Ошибка: Токен не получен";
          }
        })
        .catch((err) => {
          errorMessage.textContent = `Ошибка при получении токена: ${err.message}`;
          console.error("Token fetch error:", err);
        });
    } else {
      fetchInitialData();
    }
  
    // Boshlang'ich ma'lumotlarni olish
    async function fetchInitialData() {
      try {
        const [products, ingredients, stores, workers] = await Promise.all([
          axios.get("/api/poster/fetch-poster-api", {
            params: { token, endpoint: "menu.getProducts" },
          }),
          axios.get("/api/poster/fetch-poster-api", {
            params: { token, endpoint: "menu.getIngredients" },
          }),
          axios.get("/api/poster/fetch-poster-api", {
            params: { token, endpoint: "storage.getStorages" },
          }),
          axios.get("/api/poster/fetch-poster-api", {
            params: { token, endpoint: "access.getEmployees" },
          }),
        ]);
        productsData = products.data.response || [];
        ingredientsData = ingredients.data.response || [];
        storesData = stores.data.response || [];
        workersData = workers.data.response || [];
      } catch (err) {
        errorMessage.textContent = `Ошибка при получении данных: ${err.message}`;
        console.error("Initial data fetch error:", err);
      }
    }
  
    // Eksport qilish
    exportButton.addEventListener("click", async () => {
      const dates = fp.selectedDates;
      if (!token || dates.length !== 2) {
        errorMessage.textContent = "Пожалуйста, выберите дату";
        return;
      }
  
      const fromDate = dates[0].toLocaleDateString("en-CA");
      const toDate = dates[1].toLocaleDateString("en-CA");
      const dayDiff = (dates[1] - dates[0]) / (1000 * 60 * 60 * 24);
  
      if (dayDiff > 31) {
        errorMessage.textContent = "Максимальный интервал — 1 месяц";
        return;
      }
  
      errorMessage.textContent = "";
      loading.style.display = "flex";
      exportButton.disabled = true;
  
      try {
        // Fetch export data
        const response = await axios
          .get("/api/poster/fetch-export-data", {
            params: { token, dateFrom: fromDate, dateTo: toDate },
          })
          .catch((err) => {
            throw new Error(`Failed to fetch export data: ${err.message}`);
          });
  
        let {
          suppliesData = [],
          movesData = [],
          wastesData = [],
        } = response.data;
  
        // Supplies ma'lumotlarini qayta ishlash
        suppliesData = await Promise.all(
          suppliesData.map(async (item) => {
            try {
              const dataFetch = await axios
                .get("/api/poster/fetch-poster-api", {
                  params: {
                    token,
                    endpoint: "storage.getSupply",
                    supply_id: item.supply_id,
                  },
                })
                .catch((err) => {
                  throw new Error(
                    `Failed to fetch supply data for supply_id ${item.supply_id}: ${err.message}`
                  );
                });
  
              const fullSupply = {
                ...dataFetch.data.response,
                storage_name: item.storage_name,
              };
              const ingredients = fullSupply.ingredients || [];
  
              return ingredients.map((element) => {
                let findRest;
                const findStore =
                  storesData.find(
                    (store) => store.storage_id == fullSupply.storage_id
                  ) || {};
                if (element?.type == "10") {
                  findRest =
                    ingredientsData.find(
                      (ingredient) =>
                        ingredient.ingredient_id == element.ingredient_id
                    ) || {};
                  return {
                    ...fullSupply,
                    ...element,
                    ...findRest,
                    ingredient_unit:
                      element?.ingredient_unit == "kg"
                        ? "кг"
                        : element?.ingredient_unit == "p"
                        ? "шт"
                        : "л",
                    storage_name: findStore.storage_name || "Unknown",
                  };
                } else {
                  findRest =
                    productsData.find(
                      (product) => product.product_id == element.product_id
                    ) || {};
                  const findIngredient =
                    ingredientsData.find(
                      (ing) => ing.ingredient_id == element?.ingredient_id
                    ) || {};
                  return {
                    ...element,
                    ...findRest,
                    ...fullSupply,
                    ...findIngredient,
                    ingredient_unit:
                      element?.ingredient_unit == "kg"
                        ? "кг"
                        : element?.ingredient_unit == "p"
                        ? "шт"
                        : "л",
                    storage_name: findStore.storage_name || "Unknown",
                  };
                }
              });
            } catch (err) {
              console.error(
                `Error processing supply item ${item.supply_id}:`,
                err.message
              );
              return [];
            }
          })
        ).then((results) => results.flat());
  
        // Moves ma'lumotlarini qayta ishlash
        movesData = await Promise.all(
          movesData.map(async (item) => {
            try {
              const dataFetch = await axios
                .get("/api/poster/fetch-poster-api", {
                  params: {
                    token,
                    endpoint: "storage.getMove",
                    move_id: item.moving_id,
                  },
                })
                .catch((err) => {
                  throw new Error(
                    `Failed to fetch move data for move_id ${item.moving_id}: ${err.message}`
                  );
                });
  
              const fullMoves = Array.isArray(dataFetch.data.response)
                ? dataFetch.data.response[0] || {}
                : dataFetch.data.response || {};
              const ingredients = fullMoves.ingredients || [];
  
              return ingredients.map((element) => {
                let findRest;
                const findStore =
                  storesData.find(
                    (store) => store.storage_id == fullMoves.storage_id
                  ) || {};
                if (element?.type == "10") {
                  findRest =
                    ingredientsData.find(
                      (ingredient) =>
                        ingredient.ingredient_id == element.ingredient_id
                    ) || {};
                  return {
                    ...fullMoves,
                    ...element,
                    ...findRest,
                    ingredient_unit:
                      findRest?.ingredient_unit == "kg"
                        ? "кг"
                        : findRest?.ingredient_unit == "p"
                        ? "шт"
                        : "л",
                    storage_name: findStore.storage_name || "Unknown",
                  };
                } else {
                  findRest =
                    productsData.find(
                      (product) => product.product_id == element.product_id
                    ) || {};
                  const findIngredient =
                    ingredientsData.find(
                      (ing) => ing.ingredient_id == element?.ingredient_id
                    ) || {};
                  return {
                    ...element,
                    ...findRest,
                    ...fullMoves,
                    ...findIngredient,
                    ingredient_unit:
                      findIngredient?.unit == "kg"
                        ? "кг"
                        : findIngredient?.unit == "p"
                        ? "шт"
                        : "л",
                    storage_name: findStore.storage_name || "Unknown",
                  };
                }
              });
            } catch (err) {
              console.error(
                `Error processing move item ${item.moving_id}:`,
                err.message
              );
              return [];
            }
          })
        ).then((results) => results.flat());
  
        // Wastes ma'lumotlarini qayta ishlash
        wastesData = (
          await Promise.all(
            wastesData.map(async (item, idx) => {
              try {
                const dataFetch = await axios
                  .get("/api/poster/fetch-poster-api", {
                    params: {
                      token,
                      endpoint: "storage.getWaste",
                      waste_id: item.waste_id,
                    },
                  })
                  .catch((err) => {
                    throw new Error(
                      `Failed to fetch waste data for waste_id ${item.waste_id}: ${err.message}`
                    );
                  });
  
                const fullWastes = dataFetch.data.response || {};
                const elements = fullWastes.elements || [];
  
                const resultList = [];
  
                for (const element of elements) {
                  console.log(element);
                  const findStore =
                    storesData.find(
                      (store) => store.storage_id == fullWastes.storage_id
                    ) || {};
                  const findWorker =
                    workersData.find(
                      (worker) => worker.user_id == fullWastes.user_id
                    ) || {};
  
                  if (element?.type == "10") {
                    const findRest =
                      ingredientsData.find(
                        (ingredient) =>
                          ingredient.ingredient_id == element.ingredient_id
                      ) || {};
  
                    resultList.push({
                      ...fullWastes,
                      ...element,
                      ...findRest,
                      ingredient_unit:
                        findRest?.ingredient_unit == "kg"
                          ? "кг"
                          : findRest?.ingredient_unit == "p"
                          ? "шт"
                          : "л",
                      storage_name: findStore.storage_name || "Unknown",
                      worker_name: findWorker.name || "Unknown",
                    });
                    // return {
                    //   ...fullWastes,
                    //   ...element,
                    //   ...findRest,
                    //   ingredient_unit:
                    //     findRest?.ingredient_unit == "kg"
                    //       ? "кг"
                    //       : findRest?.ingredient_unit == "p"
                    //       ? "шт"
                    //       : "л",
                    //   storage_name: findStore.storage_name || "Unknown",
                    //   worker_name: findWorker.name || "Unknown",
                    // };
                  }
                  //  else {
                  //   findRest =
                  //     productsData.find(
                  //       (product) => product.product_id == element.product_id
                  //     ) || {};
                  //   const findIngredient =
                  //     ingredientsData.find(
                  //       (ing) =>
                  //         ing.ingredient_id ==
                  //         (element.ingredients &&
                  //           element.ingredients[0]?.ingredient_id)
                  //     ) || {};
                  //   return {
                  //     ...element,
                  //     ...findRest,
                  //     ...fullWastes,
                  //     ...findIngredient,
                  //     ingredient_unit:
                  //       findIngredient?.unit == "kg"
                  //         ? "кг"
                  //         : findIngredient?.unit == "p"
                  //         ? "шт"
                  //         : "л",
                  //     storage_name: findStore.storage_name || "Unknown",
                  //     worker_name: findWorker.name || "Unknown",
                  //   };
                  // }
                  else {
                    const findRest =
                      productsData.find(
                        (product) => product.product_id == element.product_id
                      ) || {};
  
                    const ingredients = element.ingredients || [];
  
                    for (const ing of ingredients) {
                      const ingredientMeta =
                        ingredientsData.find(
                          (i) => i.ingredient_id == ing.ingredient_id
                        ) || {};
  
                      const itemToPush = {
                        ...element,
                        ...findRest,
                        ...fullWastes,
                        ingredients: [ing], // har bir product uchun faqat 1 ta ingredient
                        ingredient_unit:
                          ingredientMeta?.unit == "kg"
                            ? "кг"
                            : ingredientMeta?.unit == "p"
                            ? "шт"
                            : "л",
                        storage_name: findStore.storage_name || "Unknown",
                        worker_name: findWorker.name || "Unknown",
                      };
  
                      resultList.push(itemToPush);
                    }
                  }
                }
  
                return resultList; // har bir waste uchun array
              } catch (err) {
                console.error(
                  `Error processing waste item ${item.waste_id}:`,
                  err.message
                );
                return [];
              }
            })
          )
        ).flat(); // barcha waste larni tekis arrayga aylantiradi
  
        // for (let i = 0; i < wastesData.length; i++) {
        //   let current = wastesData[i];
  
        //   for (let j = i + 1; j < wastesData.length; j++) {
        //     let compare = wastesData[j];
  
        //     // product_id va date bir xil bo‘lsa
        //     if (
        //       current.product_id == compare.product_id &&
        //       current.date == compare.date
        //     ) {
        //       let cost1 = current.cost;
        //       let cost2 = compare.cost;
  
        //       // cost qiymatlarini number tipga o'tkazish
        //       let isCost1String = typeof cost1 === "string";
        //       let isCost2String = typeof cost2 === "string";
  
        //       let numCost1 = isCost1String ? parseFloat(cost1) / 100 : cost1;
        //       let numCost2 = isCost2String ? parseFloat(cost2) / 100 : cost2;
  
        //       let totalCost = numCost1 + numCost2;
  
        //       // Birini saqlab qolamiz (masalan, current), unga cost ni yangilaymiz
        //       current.cost = isCost1String
        //         ? String(Math.round(totalCost * 100))
        //         : totalCost;
  
        //       // compare ni o‘chirib tashlaymiz
        //       wastesData.splice(j, 1);
        //       j--; // massiv qisqargani uchun indeksni qaytarish
  
        //       // agar kerak bo‘lsa boshqa maydonlar (total_sum, cost_netto va h.k.) ham birlashtirilishi mumkin
        //     }
        //   }
        // }
  
        // Excel faylini yaratish
        const exportChunks = [
          {
            name: "Поставки",
            headers: [
              "№",
              "Дата",
              "Поставщик",
              "Товар",
              "Кол-во",
              "Ед. изм.",
              "Сумма без НДС",
              "Склад",
              "Комментарий",
            ],
            data: suppliesData.map((item) => [
              item.supply_id || "",
              formatCustomDate(String(item.date || new Date())),
              item.supplier_name || "Unknown",
              item?.ingredient_name || "Unknown",
              Number(item?.supply_ingredient_num) || 0,
              item?.ingredient_unit || "Unknown",
              formatSupplySum(
                Number(item?.supply_ingredient_sum_netto || 0),
                false
              ),
              item.storage_name || "Unknown",
              item.supply_comment || "",
            ]),
          },
          {
            name: "Перемещения",
            headers: [
              "Дата",
              "Наименование",
              "Кол-во",
              "Ед. изм.",
              "Сумма без НДС",
              "Склад отгрузки",
              "Склад приемки",
              "Сотрудник",
            ],
            data: movesData.map((item) => [
              formatCustomDate(String(item.date || new Date())),
              item?.type == 10
                ? item?.ingredient_name || "Unknown"
                : item?.product_name || "Unknown",
              Number(item?.ingredient_num) || 0,
              item?.ingredient_unit || "Unknown",
              formatSupplySum(Number(item?.ingredient_sum_netto || 0), false),
              item.to_storage_name || "Unknown",
              item.from_storage_name || "Unknown",
              item.user_name || "Unknown",
            ]),
          },
          {
            name: "Списания",
            headers: [
              "Дата",
              "Склад",
              "Что списывается",
              "Кол-во",
              "Ед-ца измерения",
              "Сумма без НДС",
              "Причина",
              "Сотрудник",
            ],
            data: wastesData.map((item) => [
              formatCustomDate(String(item.date || new Date())),
              item.storage_name || "Unknown",
              item?.type == 10
                ? item?.ingredient_name || "Unknown"
                : item?.product_name || "Unknown",
              item?.type == 10
                ? item?.ingredients[0].weight
                : formatSupplySum(Number(item?.count || 0), false),
              item?.type == 10
                ? item?.ingredients[0].unit == "kg"
                  ? "кг"
                  : item?.ingredients[0].unit == "p"
                  ? "шт"
                  : "л"
                : item.ingredient_unit,
              item?.type == 10
                ? formatSupplySum(Number(item?.ingredients[0]?.cost || 0))
                : formatSupplySum(Number(item?.cost || 0)),
              item.reason_name || "Unknown",
              item.worker_name || "Unknown",
            ]),
          },
        ];
  
        console.log(wastesData);
  
        const wb = XLSX.utils.book_new();
        const MAX_ROWS = 10000;
  
        let hasCombined = false;
        for (const { name, headers, data } of exportChunks) {
          if (data.length <= MAX_ROWS) {
            const sheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
            XLSX.utils.book_append_sheet(wb, sheet, name);
            hasCombined = true;
          }
        }
  
        if (hasCombined) {
          const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
          const blob = new Blob([buf], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${fromDate}-${toDate}-Combined.xlsx`;
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          errorMessage.textContent = "Файлы успешно скачаны!";
        } else {
          errorMessage.textContent = "Нет данных для экспорта";
        }
      } catch (err) {
        errorMessage.textContent = `Ошибка при экспорте данных: ${err.message}`;
        console.error("Export error:", err);
      } finally {
        loading.style.display = "none";
        exportButton.disabled = false;
      }
    });
  
    // Spinnerni yashirish
    window.addEventListener("load", () => {
      if (window.top && window.top !== window) {
        window.top.postMessage({ hideSpinner: true }, "*");
      }
    });
  });
  