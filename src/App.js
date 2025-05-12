import React, { useState, useEffect, useMemo } from 'react';
import { database } from './firebase';
import { ref, push, onValue, remove, update } from 'firebase/database';
import { get } from 'firebase/database';
import { useNavigate } from 'react-router-dom';


function App() {
  const [products, setProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('すべて');
  const [showTaxIncluded, setShowTaxIncluded] = useState(true);
  const [editTarget, setEditTarget] = useState(null);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [editErrors, setEditErrors] = useState({});
  //  const formatPrice = (price) => Number(price).toLocaleString();
  const [groupCode, setGroupCode] = useState(localStorage.getItem('groupCode') || '');
  const [inputCode, setInputCode] = useState('');
  const today = new Date().toISOString().split('T')[0];
  const [errorMsg, setErrorMsg] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const navigate = useNavigate();


  const [form, setForm] = useState({
    商品名: '',
    金額: '',
    店舗名: '',
    記録日: today,
  });

  useEffect(() => {
    if (!groupCode) return;

    const dataRef = ref(database, `/groups/${groupCode}/products`);
    const storesRef = ref(database, `/groups/${groupCode}/stores`);

    onValue(dataRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const productsArray = Object.entries(data).map(([id, value]) => ({ id, ...value }));
        productsArray.sort((a, b) => new Date(b['記録日']) - new Date(a['記録日']));
        setProducts(productsArray);
      } else {
        setProducts([]);
      }
    });

    // 現在地取得

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
      },
      (err) => {
        console.warn('位置情報取得失敗:', err);
      }
    );

    /*

    // 距離を計算する関数（Haversine公式）
    const calculateDistance = (lat1, lng1, lat2, lng2) => {
      const R = 6371e3; // 地球の半径（m）
      const toRad = (x) => (x * Math.PI) / 180;
      const φ1 = toRad(lat1);
      const φ2 = toRad(lat2);
      const Δφ = toRad(lat2 - lat1);
      const Δλ = toRad(lng2 - lng1);

      const a = Math.sin(Δφ / 2) ** 2 +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c; // 距離（m）
    };

    // 最寄り店舗を計算
    
    const nearestStore = stores
      .filter((s) => s.lat && s.lng && s.status !== '無効')
      .map((store) => ({
        ...store,
        distance: userLocation
          ? calculateDistance(userLocation.lat, userLocation.lng, store.lat, store.lng)
          : Infinity,
      }))
      .sort((a, b) => a.distance - b.distance)[0];
      */

    onValue(storesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const storesArray = Object.entries(data).map(([id, value]) => ({ id, ...value }));
        setStores(storesArray);
        if (storesArray.length > 0) {
          setForm((prev) => ({ ...prev, 店舗名: storesArray[0].店舗名 }));
        }
      } else {
        setStores([]);
      }
    });
  }, [groupCode]);

  // useEffect外に出す（stores & userLocation に依存するようにする）
  const nearestStore = useMemo(() => {
    if (!userLocation || stores.length === 0) return null;

    const calculateDistance = (lat1, lng1, lat2, lng2) => {
      const R = 6371e3;
      const toRad = (x) => (x * Math.PI) / 180;
      const φ1 = toRad(lat1);
      const φ2 = toRad(lat2);
      const Δφ = toRad(lat2 - lat1);
      const Δλ = toRad(lng2 - lng1);

      const a = Math.sin(Δφ / 2) ** 2 +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    return stores
      .filter((s) => s.lat && s.lng && s.status !== '無効')
      .map((store) => ({
        ...store,
        distance: calculateDistance(userLocation.lat, userLocation.lng, store.lat, store.lng),
      }))
      .sort((a, b) => a.distance - b.distance)[0];
  }, [stores, userLocation]);

  const productNames = [...new Set(products.map((p) => p['商品名']))];

  const filteredProducts =
    selectedProduct === 'すべて'
      ? products
      : products.filter((p) => p['商品名'] === selectedProduct);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === '金額') {
      const numericValue = value.replace(/[^\d]/g, '');
      const formatted = numericValue ? Number(numericValue).toLocaleString() : '';
      setForm({ ...form, [name]: formatted });
    } else {
      setForm({ ...form, [name]: value });
    }
    setErrors({ ...errors, [name]: '' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    let newErrors = {};

    if (!form.商品名.trim()) newErrors.商品名 = '商品名を入力してください。';
    const numericPrice = Number(form.金額.replace(/,/g, ''));
    if (form.金額.trim() === '' || isNaN(numericPrice) || numericPrice < 0)
      newErrors.金額 = '金額は0以上の数字を入力してください。';
    if (!form.店舗名.trim()) newErrors.店舗名 = '店舗名を選択してください。';
    if (form.記録日 > today) newErrors.記録日 = '未来の日付は選択できません。';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    // 店舗情報を取得
    const selectedStore = stores.find((s) => s.店舗名 === form.店舗名);

    // 金額変換（デフォルトはそのまま）
    let finalPrice = numericPrice;
    if (selectedStore && selectedStore.taxType === '税込') {
      finalPrice = Math.round(numericPrice / 1.08);
    }

    // payload作成
    const payload = { ...form, 金額: finalPrice };

    // DBへ保存
    push(ref(database, `/groups/${groupCode}/products`), payload);
    // フォームリセット
    setForm({ 商品名: '', 金額: '', 店舗名: stores[0]?.店舗名 || '', 記録日: today });
    setErrors({});
  };

  const handleDelete = (id) => {
    if (window.confirm('削除しますか？')) {
      remove(ref(database, `/groups/${groupCode}/products/${id}`));
    }
  };

  const handleEdit = (item) => {
    setEditTarget({ ...item, 金額: item['金額'].toLocaleString() });
    setEditErrors({});
    setEditModalOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    if (name === '金額') {
      const numericValue = value.replace(/[^\d]/g, '');
      const formatted = numericValue ? Number(numericValue).toLocaleString() : '';
      setEditTarget({ ...editTarget, [name]: formatted });
    } else {
      setEditTarget({ ...editTarget, [name]: value });
    }
    setEditErrors({ ...editErrors, [name]: '' });
  };

  const handleEditSubmit = () => {
    let newErrors = {};

    if (!editTarget.商品名.trim()) newErrors.商品名 = '商品名を入力してください。';
    const numericPrice = Number(editTarget.金額.replace(/,/g, ''));
    if (editTarget.金額.trim() === '' || isNaN(numericPrice) || numericPrice < 0)
      newErrors.金額 = '金額は0以上の数字を入力してください。';
    if (!editTarget.店舗名.trim()) newErrors.店舗名 = '店舗名を選択してください。';
    if (editTarget.記録日 > today) newErrors.記録日 = '未来の日付は選択できません。';

    setEditErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    if (window.confirm('更新しますか？')) {
      const dataRef = ref(database, `/groups/${groupCode}/products/${editTarget.id}`);
      update(dataRef, {
        商品名: editTarget['商品名'],
        金額: numericPrice,
        店舗名: editTarget['店舗名'],
        記録日: editTarget['記録日'],
      });
      setEditModalOpen(false);
    }
  };

  const formatDisplayDate = (dateStr) => {
    const date = new Date(dateStr);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} (${days[date.getDay()]})`;
  };

  const calculatePrice = (price) => {
    if (!showTaxIncluded) return Number(price).toLocaleString();
    const taxPrice = Math.floor(price * 1.08);
    return Number(taxPrice).toLocaleString();
  };

  //3ヶ月前の日付取得
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  //最安値取得
  const lowestPrices = products.reduce((acc, item) => {
    const productName = item['商品名'];
    const price = item['金額'];
    const store = item['店舗名'];
    const date = new Date(item['記録日']);

    // 全期間最安値
    if (!acc[productName] || price < acc[productName].allTimeLowest.price) {
      acc[productName] = {
        ...acc[productName],
        allTimeLowest: { price, store, date }
      };
    }

    // 3ヶ月以内最安値
    if (date >= threeMonthsAgo) {
      if (!acc[productName]?.recentLowest || price < acc[productName].recentLowest.price) {
        acc[productName] = {
          ...acc[productName],
          recentLowest: { price, store, date }
        };
      }
    }

    return acc;
  }, {});

  if (!groupCode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="p-6 bg-white rounded shadow-md space-y-4">
          <h2 className="text-xl font-semibold">家族コードを入力してください</h2>
          <input
            type="text"
            placeholder="家族コード"
            className="w-full p-3 border rounded-md"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
          />
          {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}
          <button
            className="w-full p-3 bg-lightblue-300 rounded-md hover:bg-lightblue-400"
            onClick={async () => {
              const trimmedCode = inputCode.trim();
              if (!trimmedCode) {
                setErrorMsg('家族コードを入力してください');
                return;
              }

              const codeRef = ref(database, `/groups/${trimmedCode}`);
              const snapshot = await get(codeRef);
              if (!snapshot.exists()) {
                setErrorMsg('その家族コードは存在しません');
                return;
              }

              localStorage.setItem('groupCode', trimmedCode);
              setGroupCode(trimmedCode);
              setErrorMsg(''); // エラー消す
            }}
          >
            確定
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-rounded bg-gray-100 text-gray-900">
      <header className="bg-lightblue-200 text-gray-800 p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Shopping Journal</h1>

        <div className="flex items-center gap-2">
          {/* 税込/税抜ボタンは常に見せる */}
          <button
            onClick={() => setShowTaxIncluded(!showTaxIncluded)}
            className="rounded-md px-3 py-1 bg-lightblue-300 text-gray-800 hover:bg-lightblue-400 transition"
          >
            {showTaxIncluded ? '税込で表示中' : '税抜で表示中'}
          </button>

          {/* ハンバーガーメニュー */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="px-3 py-2 bg-lightblue-300 rounded-md hover:bg-lightblue-400"
            >
              ≡
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 bg-white shadow-lg rounded-md py-2 w-48 z-50">
                <button
                  onClick={() => {
                    localStorage.removeItem('groupCode');
                    setGroupCode('');
                    setShowMenu(false);
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  家族コード変更
                </button>
                <button
                  onClick={() => {
                    navigate('/store-admin');
                    setShowMenu(false);
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  店舗管理画面へ
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <div className="mb-4 text-sm text-blue-600">
          {!userLocation && (
            <div className="text-gray-500">📡 位置情報取得中...</div>
          )}

          {userLocation && !nearestStore && (
            <div className="text-gray-500">🔍 最寄り店舗を計算中...</div>
          )}

          {nearestStore && (
            <>
              📍 最寄り店舗：<span className="font-semibold">{nearestStore.店舗名}</span><br />
              🛣️ 距離：約{Math.round(nearestStore.distance)}m
            </>
          )}
        </div>
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">最安値一覧</h2>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(lowestPrices).map(([name, data]) => {
              const info = data.recentLowest || data.allTimeLowest;
              const isOld = !data.recentLowest; // 直近3ヶ月にデータが無ければ注意

              return (
                <div key={name} className="rounded-md shadow-sm p-4 bg-white dark:bg-gray-800">
                  <h3 className="text-lg font-medium">{name}</h3>
                  <p className="text-sm">
                    💰 {calculatePrice(info.price)}円
                  </p>
                  <p className="text-sm">🏪 {info.store}</p>
                  {isOld && (
                    <p className="text-xs text-red-600 font-semibold mt-1 flex items-center gap-1">
                      ⚠️ <span>3ヶ月以上前の価格</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">新規購入入力</h2>
          <form onSubmit={handleSubmit} className="rounded-md shadow-sm p-6 bg-white dark:bg-gray-800 space-y-4">
            <div>
              <input
                type="text"
                name="商品名"
                placeholder="商品名"
                value={form.商品名}
                onChange={handleChange}
                className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-lightblue-400"
              />
              {errors.商品名 && <p className="text-red-500 text-sm mt-1">{errors.商品名}</p>}
            </div>

            <div>
              <input
                type="text"
                name="金額"
                value={form.金額}
                onChange={handleChange}
                className="w-full p-3 border rounded-md"
                inputMode="numeric"
                pattern="[0-9,]*"
                placeholder="金額（円）"
              />
              {errors.金額 && <p className="text-red-500 text-sm mt-1">{errors.金額}</p>}
            </div>

            <div>
              <select
                name="店舗名"
                value={form.店舗名}
                onChange={handleChange}
                className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-lightblue-400"
              >
                {stores.map((store) => (
                  <option key={store.id} value={store.店舗名}>
                    {store.店舗名}（{store.taxType}）
                  </option>
                ))}
              </select>
              {errors.店舗名 && <p className="text-red-500 text-sm mt-1">{errors.店舗名}</p>}
            </div>

            <div>
              <input
                type="date"
                name="記録日"
                max={today}
                value={form.記録日}
                onChange={handleChange}
                className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-lightblue-400"
              />
              {errors.記録日 && <p className="text-red-500 text-sm mt-1">{errors.記録日}</p>}
            </div>

            <button
              type="submit"
              className="w-full p-3 rounded-md bg-lightblue-300 text-gray-800 hover:bg-lightblue-400 dark:bg-lightblue-500 dark:text-gray-900 dark:hover:bg-lightblue-600 transition"
            >
              ➕ 追加
            </button>
          </form>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">購入履歴</h2>
          <div className="mb-4">
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full p-3 border rounded-md"
            >
              <option value="すべて">すべて</option>
              {productNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {isEditModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-md w-full max-w-md">
                <h2 className="text-xl font-semibold mb-4">編集</h2>
                <input
                  type="text"
                  name="商品名"
                  value={editTarget['商品名']}
                  onChange={handleEditChange}
                  className="w-full p-3 mb-2 border rounded-md"
                  placeholder="商品名"
                />
                {editErrors.商品名 && <p className="text-red-500 text-sm mb-2">{editErrors.商品名}</p>}
                <input
                  type="text"
                  name="金額"
                  value={editTarget['金額']}
                  onChange={handleEditChange}
                  className="w-full p-3 mb-2 border rounded-md"
                  placeholder="金額（円）"
                />
                {editErrors.金額 && <p className="text-red-500 text-sm mb-2">{editErrors.金額}</p>}
                <label className="block text-sm font-medium mb-1">店舗名</label>
                <select
                  name="店舗名"
                  value={editTarget['店舗名']}
                  onChange={(e) =>
                    setEditTarget((prev) => ({ ...prev, 店舗名: e.target.value }))
                  }
                  className="w-full p-3 border rounded-md mb-3"
                >
                  {stores.map((store) => (
                    <option key={store.id} value={store.店舗名}>
                      {store.店舗名}（{store.taxType}）
                    </option>
                  ))}
                </select>
                {editErrors.店舗名 && <p className="text-red-500 text-sm mb-2">{editErrors.店舗名}</p>}

                <input
                  type="date"
                  name="記録日"
                  max={today}
                  value={editTarget['記録日']}
                  onChange={handleEditChange}
                  className="w-full p-3 mb-4 border rounded-md"
                />
                {editErrors.記録日 && <p className="text-red-500 text-sm mb-2">{editErrors.記録日}</p>}
                <div className="flex justify-end space-x-2">
                  <button onClick={() => setEditModalOpen(false)} className="px-4 py-2 bg-gray-400 rounded-md hover:bg-gray-500 transition">キャンセル</button>
                  <button onClick={handleEditSubmit} className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition">更新</button>
                </div>
              </div>
            </div>
          )}

          <section className="space-y-4">
            {filteredProducts.map((item) => (
              <div key={item.id} className="rounded-md shadow-sm p-4 flex justify-between items-center bg-white dark:bg-gray-800">
                <div>
                  <h3 className="text-lg font-medium">{item['商品名']}</h3>
                  <p className="text-sm">💰 {calculatePrice(item['金額'])}円</p>
                  <p className="text-sm">📅 {formatDisplayDate(item['記録日'])}</p>
                  <p className="text-sm">🏪 {item['店舗名']}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(item)} className="px-3 py-1 rounded-md bg-lightblue-300 text-gray-800 hover:bg-lightblue-400 transition dark:bg-yellow-500 dark:text-gray-900 dark:hover:bg-yellow-600">編集</button>
                  <button onClick={() => handleDelete(item.id)} className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition">削除</button>
                </div>
              </div>
            ))}
          </section>
        </section>
      </main>
    </div>
  );
}

export default App;
