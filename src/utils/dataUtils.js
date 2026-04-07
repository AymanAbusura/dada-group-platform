// import { FORM_SECTIONS } from './formData.js';

// function buildModelCompMap() {
//   const map = {};
//   FORM_SECTIONS.forEach(section => {
//     section.products.forEach(product => {
//       map[product.existsName] = product.competitors.map(comp => ({
//         compLabel: `${comp.brand} ${comp.model.trim().replace(/\s+/g, ' ')}`,
//         priceKey:  comp.priceName,
//       }));
//     });
//   });
//   return map;
// }

// export const MODEL_COMP_MAP = buildModelCompMap();

// export function isYes(v) {
//   if (!v) return false;
//   const s = String(v).toLowerCase().trim();
//   return s === 'yes' || s === 'نعم';
// }

// export function getField(row, ...keys) {
//   for (const k of keys) if (row[k] !== undefined && row[k] !== '') return row[k];
//   return '';
// }

// export function getModelCols(rows) {
//   if (!rows.length) return [];
//   const keys = new Set();
//   rows.forEach(r => Object.keys(r).forEach(k => { if (k.endsWith('_exists')) keys.add(k); }));
//   return [...keys];
// }

// export function getPriceCols(rows) {
//   if (!rows.length) return [];
//   const keys = new Set();
//   rows.forEach(r => Object.keys(r).forEach(k => { if (k.endsWith('_price')) keys.add(k); }));
//   return [...keys];
// }

// export function getUnique(data, ...keys) {
//   const s = new Set();
//   data.forEach(r => { const v = getField(r, ...keys); if (v) s.add(v); });
//   return [...s].sort();
// }

// export function computeKPIs(data) {
//   if (!data.length) return { total: 0, shops: 0, reps: 0, models: 0, availPct: 0, topComp: '—' };

//   const shops     = new Set(data.map(r => getField(r, 'shop_name')));
//   const reps      = new Set(data.map(r => getField(r, 'rep_name')));
//   const modelCols = getModelCols(data);

//   const allShops = new Set(data.map(r => getField(r, 'shop_name')).filter(Boolean));
//   const shopDenom = allShops.size || data.length;
//   let yes = 0, total = 0;
//   modelCols.forEach(col => {
//     const yesShops = new Set();
//     data.forEach(r => {
//       const shop = getField(r, 'shop_name');
//       if (shop && isYes(r[col])) yesShops.add(shop);
//     });
//     yes += yesShops.size;
//     total += shopDenom;
//   });

//   const compFreq = buildCompFreq(data);
//   const topEntry = Object.entries(compFreq).sort((a, b) => b[1] - a[1])[0];

//   return {
//     total:    data.length,
//     shops:    shops.size,
//     reps:     reps.size,
//     models:   modelCols.length,
//     availPct: total > 0 ? Math.round((yes / total) * 100) : 0,
//     topComp:  topEntry ? topEntry[0].split(' ')[0] : '—',
//   };
// }

// export function buildCompFreq(data) {
//   const freq = {};
//   getPriceCols(data).forEach(col => {
//     const label = col.replace(/_price$/, '');
//     data.forEach(r => {
//       const v = parseFloat(r[col]);
//       if (!isNaN(v) && v > 0) freq[label] = (freq[label] || 0) + 1;
//     });
//   });
//   return freq;
// }

// export function buildCompPrices(data) {
//   const prices = {};
//   getPriceCols(data).forEach(col => {
//     const label = col.replace(/_price$/, '');
//     data.forEach(r => {
//       const v = parseFloat(r[col]);
//       if (!isNaN(v) && v > 0) {
//         if (!prices[label]) prices[label] = [];
//         prices[label].push(v);
//       }
//     });
//   });
//   return prices;
// }

// export function buildAvailList(data) {
//   const allShops = new Set(data.map(r => getField(r, 'shop_name')).filter(Boolean));
//   const denom = allShops.size || data.length;

//   const existsMeta = {};
//   FORM_SECTIONS.forEach(section => {
//     section.products.forEach(product => {
//       existsMeta[product.existsName] = {
//         brand: product.brand,
//         label: `${product.brand} ${product.model.trim().replace(/\s+/g, ' ')}`,
//       };
//     });
//   });

//   return getModelCols(data).map(col => {
//     const meta  = existsMeta[col] || {};
//     const brand = meta.brand || col.split('_')[0];
//     const label = meta.label || col.replace('_exists', '');

//     const yesShops = new Set();
//     data.forEach(r => {
//       const shop = getField(r, 'shop_name');
//       if (shop && isYes(r[col])) yesShops.add(shop);
//     });
//     const yes = yesShops.size;
//     const pct = denom > 0 ? Math.round((yes / denom) * 100) : 0;
//     return { col, model: col.replace('_exists', ''), brand, label, pct, yes, total: denom };
//   }).sort((a, b) => b.pct - a.pct);
// }

// export function buildAreaCounts(data) {
//   const c = {};
//   data.forEach(r => { const a = getField(r, 'area') || 'غير محدد'; c[a] = (c[a] || 0) + 1; });
//   return Object.entries(c).sort((a, b) => b[1] - a[1]);
// }

// export function buildRepCounts(data) {
//   const c = {};
//   data.forEach(r => { const n = getField(r, 'rep_name') || 'غير محدد'; c[n] = (c[n] || 0) + 1; });
//   return Object.entries(c).sort((a, b) => b[1] - a[1]);
// }

// export function buildPriceTableEntries(data) {
//   const priceMeta = {};
//   FORM_SECTIONS.forEach(section => {
//     section.products.forEach(product => {
//       product.competitors.forEach(comp => {
//         if (!priceMeta[comp.priceName]) {
//           priceMeta[comp.priceName] = {
//             brand: comp.brand,
//             model: comp.model.trim().replace(/\s+/g, ' '),
//           };
//         }
//       });
//     });
//   });

//   return Object.entries(buildCompPrices(data))
//     .map(([label, arr]) => {
//       const priceKey = label + '_price';
//       const meta = priceMeta[priceKey] || {};
//       return {
//         label,
//         brand: meta.brand || label.split('_')[0],
//         model: meta.model || label,
//         avg:   Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
//         min:   Math.min(...arr),
//         max:   Math.max(...arr),
//         count: arr.length,
//       };
//     })
//     .sort((a, b) => b.count - a.count);
// }

// export function getModelDetail(data, existsCol) {
//   if (!existsCol || !data.length) return null;

//   const allShops = new Set(data.map(r => getField(r, 'shop_name')).filter(Boolean));
//   const denom = allShops.size || data.length;
//   const yesShops = new Set();
//   data.forEach(r => {
//     const shop = getField(r, 'shop_name');
//     if (shop && isYes(r[existsCol])) yesShops.add(shop);
//   });
//   const yes = yesShops.size;
//   const total = denom;

//   const compDefs = MODEL_COMP_MAP[existsCol] || [];

//   const competitors = compDefs.map(({ compLabel, priceKey }) => {
//     const arr = [];
//     data.forEach(r => {
//       const v = parseFloat(r[priceKey]);
//       if (!isNaN(v) && v > 0) arr.push(v);
//     });

//     if (!arr.length) return null;
//     return {
//       name:  compLabel,
//       avg:   Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
//       min:   Math.min(...arr),
//       max:   Math.max(...arr),
//       count: arr.length,
//     };
//   }).filter(Boolean);

//   return {
//     avPct: total > 0 ? Math.round((yes / total) * 100) : 0,
//     yes,
//     total,
//     competitors,
//   };
// }

import { FORM_SECTIONS } from './formData.js';

// Build a map: existsName → [ { compLabel, readablePriceKey } ]
// readablePriceKey matches what flattenRecord() stores: "Brand Model_price"
function buildModelCompMap() {
  const map = {};
  FORM_SECTIONS.forEach(section => {
    section.products.forEach(product => {
      map[product.existsName] = product.competitors.map(comp => {
        const cleanModel = comp.model.trim().replace(/\s+/g, ' ');
        // This is the readable key that flattenRecord() actually stores in the row
        const readablePriceKey = `${comp.brand} ${cleanModel}_price`;
        return {
          compLabel:       `${comp.brand} ${cleanModel}`,
          priceKey:        readablePriceKey,   // ← was comp.priceName (wrong key format)
          rawPriceName:    comp.priceName,     // keep for reference
        };
      });
    });
  });
  return map;
}

export const MODEL_COMP_MAP = buildModelCompMap();

export function isYes(v) {
  if (!v) return false;
  const s = String(v).toLowerCase().trim();
  return s === 'yes' || s === 'نعم';
}

export function getField(row, ...keys) {
  for (const k of keys) if (row[k] !== undefined && row[k] !== '') return row[k];
  return '';
}

export function getModelCols(rows) {
  if (!rows.length) return [];
  const keys = new Set();
  rows.forEach(r => Object.keys(r).forEach(k => { if (k.endsWith('_exists')) keys.add(k); }));
  return [...keys];
}

// Price cols — readable format ends with _price or _price_2, _price_3 etc.
export function getPriceCols(rows) {
  if (!rows.length) return [];
  const keys = new Set();
  rows.forEach(r =>
    Object.keys(r).forEach(k => {
      if (/_price(\d+)?$/.test(k) && !k.endsWith('_avail')) keys.add(k);
    })
  );
  return [...keys];
}

export function getUnique(data, ...keys) {
  const s = new Set();
  data.forEach(r => { const v = getField(r, ...keys); if (v) s.add(v); });
  return [...s].sort();
}

export function computeKPIs(data) {
  if (!data.length) return { total: 0, shops: 0, reps: 0, models: 0, availPct: 0, topComp: '—' };

  const shops     = new Set(data.map(r => getField(r, 'shop_name')));
  const reps      = new Set(data.map(r => getField(r, 'rep_name')));
  const modelCols = getModelCols(data);

  const allShops  = new Set(data.map(r => getField(r, 'shop_name')).filter(Boolean));
  const shopDenom = allShops.size || data.length;
  let yes = 0, total = 0;
  modelCols.forEach(col => {
    const yesShops = new Set();
    data.forEach(r => {
      const shop = getField(r, 'shop_name');
      if (shop && isYes(r[col])) yesShops.add(shop);
    });
    yes   += yesShops.size;
    total += shopDenom;
  });

  const compFreq = buildCompFreq(data);
  const topEntry = Object.entries(compFreq).sort((a, b) => b[1] - a[1])[0];

  return {
    total:    data.length,
    shops:    shops.size,
    reps:     reps.size,
    models:   modelCols.length,
    availPct: total > 0 ? Math.round((yes / total) * 100) : 0,
    topComp:  topEntry ? topEntry[0].split(' ')[0] : '—',
  };
}

export function buildCompFreq(data) {
  const freq = {};
  data.forEach(r => {
    Object.keys(r).forEach(k => {
      // Match readable price keys: "Brand Model_price" or "_price2"
      if (!/_price(\d+)?$/.test(k)) return;
      const v = parseFloat(r[k]);
      if (!isNaN(v) && v > 0) {
        // Normalize: strip trailing _price_N suffix to get base label
        const label = k.replace(/_price\d*$/, '_price').replace(/_price$/, '');
        freq[label] = (freq[label] || 0) + 1;
      }
    });
  });
  return freq;
}

export function buildCompPrices(data) {
  const prices = {};
  data.forEach(r => {
    Object.keys(r).forEach(k => {
      if (!/_price(\d+)?$/.test(k)) return;
      const v = parseFloat(r[k]);
      if (!isNaN(v) && v > 0) {
        const label = k.replace(/_price\d*$/, '_price').replace(/_price$/, '');
        if (!prices[label]) prices[label] = [];
        prices[label].push(v);
      }
    });
  });
  return prices;
}

export function buildAvailList(data) {
  const allShops = new Set(data.map(r => getField(r, 'shop_name')).filter(Boolean));
  const denom    = allShops.size || data.length;

  // Build meta from FORM_SECTIONS using the readable exists key
  const existsMeta = {};
  FORM_SECTIONS.forEach(section => {
    section.products.forEach(product => {
      existsMeta[product.existsName] = {
        brand: product.brand,
        label: `${product.brand} ${product.model.trim().replace(/\s+/g, ' ')}`,
      };
    });
  });

  return getModelCols(data).map(col => {
    const meta  = existsMeta[col] || {};
    const brand = meta.brand || col.split('_')[0];
    const label = meta.label || col.replace('_exists', '');

    const yesShops = new Set();
    data.forEach(r => {
      const shop = getField(r, 'shop_name');
      if (shop && isYes(r[col])) yesShops.add(shop);
    });
    const yes = yesShops.size;
    const pct = denom > 0 ? Math.round((yes / denom) * 100) : 0;
    return { col, model: col.replace('_exists', ''), brand, label, pct, yes, total: denom };
  }).sort((a, b) => b.pct - a.pct);
}

export function buildAreaCounts(data) {
  const c = {};
  data.forEach(r => { const a = getField(r, 'area') || 'غير محدد'; c[a] = (c[a] || 0) + 1; });
  return Object.entries(c).sort((a, b) => b[1] - a[1]);
}

export function buildRepCounts(data) {
  const c = {};
  data.forEach(r => { const n = getField(r, 'rep_name') || 'غير محدد'; c[n] = (c[n] || 0) + 1; });
  return Object.entries(c).sort((a, b) => b[1] - a[1]);
}

export function buildPriceTableEntries(data) {
  // Build meta: readable label → { brand, model }
  const priceMeta = {};
  FORM_SECTIONS.forEach(section => {
    section.products.forEach(product => {
      product.competitors.forEach(comp => {
        const cleanModel   = comp.model.trim().replace(/\s+/g, ' ');
        const readableBase = `${comp.brand} ${cleanModel}`;   // without _price
        if (!priceMeta[readableBase]) {
          priceMeta[readableBase] = { brand: comp.brand, model: cleanModel };
        }
      });
    });
  });

  return Object.entries(buildCompPrices(data))
    .map(([label, arr]) => {
      const meta = priceMeta[label] || {};
      return {
        label,
        brand: meta.brand || label.split(' ')[0],
        model: meta.model || label,
        avg:   Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
        min:   Math.min(...arr),
        max:   Math.max(...arr),
        count: arr.length,
      };
    })
    .sort((a, b) => b.count - a.count);
}

/**
 * getModelDetail — fixed to use readable price keys (matching flattenRecord output).
 * Also falls back to scanning ALL price columns in data if none match the map,
 * so partial data is never silently dropped.
 */
export function getModelDetail(data, existsCol) {
  if (!existsCol || !data.length) return null;

  const allShops = new Set(data.map(r => getField(r, 'shop_name')).filter(Boolean));
  const denom    = allShops.size || data.length;
  const yesShops = new Set();
  data.forEach(r => {
    const shop = getField(r, 'shop_name');
    if (shop && isYes(r[existsCol])) yesShops.add(shop);
  });
  const yes   = yesShops.size;
  const total = denom;

  // Competitor definitions for this model (using readable price keys now)
  const compDefs = MODEL_COMP_MAP[existsCol] || [];

  // Collect all prices observed per competitor label
  const pricesByComp = {};

  if (compDefs.length > 0) {
    // Primary path: use mapped competitor price keys
    compDefs.forEach(({ compLabel, priceKey }) => {
      data.forEach(r => {
        // Check exact key AND numbered variants (_price2, _price3...)
        Object.keys(r).forEach(k => {
          const isMatch =
            k === priceKey ||
            k.startsWith(priceKey.replace(/_price$/, '_price')) && /_price\d+$/.test(k);
          if (isMatch) {
            const v = parseFloat(r[k]);
            if (!isNaN(v) && v > 0) {
              if (!pricesByComp[compLabel]) pricesByComp[compLabel] = [];
              pricesByComp[compLabel].push(v);
            }
          }
        });
      });
    });
  }

  // Fallback / supplement: scan ALL price columns in data
  // This catches any prices that slipped through due to key mismatches
  const allPriceCols = new Set();
  data.forEach(r => Object.keys(r).forEach(k => {
    if (/_price(\d+)?$/.test(k)) allPriceCols.add(k);
  }));

  const knownPriceKeys = new Set(compDefs.map(d => d.priceKey));

  allPriceCols.forEach(k => {
    // Strip numbered suffix to get base key
    const baseKey = k.replace(/_price\d+$/, '_price');
    // Skip if already covered by map
    if (knownPriceKeys.has(baseKey) || knownPriceKeys.has(k)) return;
    // Use readable label from key itself
    const label = k.replace(/_price\d*$/, '');
    data.forEach(r => {
      const v = parseFloat(r[k]);
      if (!isNaN(v) && v > 0) {
        if (!pricesByComp[label]) pricesByComp[label] = [];
        pricesByComp[label].push(v);
      }
    });
  });

  const competitors = Object.entries(pricesByComp)
    .map(([name, arr]) => ({
      name,
      avg:   Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
      min:   Math.min(...arr),
      max:   Math.max(...arr),
      count: arr.length,
    }))
    .sort((a, b) => b.count - a.count);

  return { avPct: total > 0 ? Math.round((yes / total) * 100) : 0, yes, total, competitors };
}