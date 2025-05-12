import React, { useEffect, useState } from 'react';
import { database } from './firebase';
import { ref, push, onValue, update, remove } from 'firebase/database';
import { useNavigate } from 'react-router-dom';

function StoreAdmin() {
    const [stores, setStores] = useState([]);
    const [form, setForm] = useState({
        店舗名: '',
        taxType: '税込',
        住所: '',
        備考: '',
        status: '有効',
    });
    const [editTarget, setEditTarget] = useState(null);
    const [showMenu, setShowMenu] = useState(false);
    const navigate = useNavigate();
    const groupCode = localStorage.getItem('groupCode');

    // 取得
    useEffect(() => {
        if (!groupCode) return;
        const storesRef = ref(database, `/groups/${groupCode}/stores`);
        onValue(storesRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const storesArray = Object.entries(data).map(([id, value]) => ({ id, ...value }));
                setStores(storesArray);
            } else {
                setStores([]);
            }
        });
    }, [groupCode]);

    // 入力ハンドラー
    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    // Geocoding処理（Google Maps API）
    const geocode = async (address) => {
        const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.REACT_APP_GOOGLE_API_KEY}`
        );
        const data = await res.json();
        if (data.status === 'OK') {
            const { lat, lng } = data.results[0].geometry.location;
            return { lat, lng };
        }
        return null;
    };

    // 新規登録
    const handleSubmit = async (e) => {
        e.preventDefault();

        let lat = null;
        let lng = null;

        // 住所があればGeocodeで緯度経度取得
        if (form.住所.trim()) {
            const location = await geocode(form.住所);
            console.log("📍 geocode result:", location); // ←★追加！
            if (location) {
                lat = location.lat;
                lng = location.lng;
            } else {
                console.warn("❌ Geocode失敗: 緯度経度が取得できませんでした");
            }
        }

        const payload = {
            ...form,
            lat,
            lng,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        push(ref(database, `/groups/${groupCode}/stores`), payload);
        setForm({ 店舗名: '', taxType: '税込', 住所: '', 備考: '', status: '有効' });
    };

    // 削除
    const handleDelete = (id) => {
        if (window.confirm('本当に削除しますか？')) {
            remove(ref(database, `/groups/${groupCode}/stores/${id}`));
        }
    };

    // 編集保存
    const handleEditSubmit = async () => {
        let lat = editTarget.lat || null;
        let lng = editTarget.lng || null;

        // 住所が変わっていたら geocode しなおす
        if (editTarget.住所?.trim()) {
            const location = await geocode(editTarget.住所);
            if (location) {
                lat = location.lat;
                lng = location.lng;
            }
        }

        const payload = {
            店舗名: editTarget.店舗名,
            taxType: editTarget.taxType,
            住所: editTarget.住所,
            備考: editTarget.備考,
            status: editTarget.status,
            lat,
            lng,
            updatedAt: new Date().toISOString(),
        };

        update(ref(database, `/groups/${groupCode}/stores/${editTarget.id}`), payload);
        setEditTarget(null);
    };

    return (
        <div className="min-h-screen font-rounded bg-gray-100 text-gray-900">
            <header className="bg-lightblue-200 text-gray-800 p-4 flex justify-between items-center">
                <h1 className="text-2xl font-bold">Shopping Journal - 店舗管理</h1>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            localStorage.removeItem('groupCode');
                            navigate('/');
                        }}
                        className="rounded-md px-3 py-1 bg-lightblue-300 text-gray-800 hover:bg-lightblue-400 transition"
                    >
                        家族コード変更
                    </button>

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
                                        navigate('/');
                                        setShowMenu(false);
                                    }}
                                    className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                                >
                                    トップページに戻る
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-6">
            {/* 新規追加フォーム */}
            <form onSubmit={handleSubmit} className="mb-6 space-y-4">
                <h2 className="text-xl font-semibold mb-2">新規店舗追加</h2>
                <input
                    type="text"
                    name="店舗名"
                    placeholder="店舗名"
                    value={form.店舗名}
                    onChange={handleChange}
                    className="w-full p-3 border rounded-md"
                    required
                />
                <select
                    name="taxType"
                    value={form.taxType}
                    onChange={handleChange}
                    className="w-full p-3 border rounded-md"
                >
                    <option value="税込">税込</option>
                    <option value="税抜">税抜</option>
                </select>
                <input
                    type="text"
                    name="住所"
                    placeholder="住所"
                    value={form.住所}
                    onChange={handleChange}
                    className="w-full p-3 border rounded-md"
                />
                <input
                    type="text"
                    name="備考"
                    placeholder="備考"
                    value={form.備考}
                    onChange={handleChange}
                    className="w-full p-3 border rounded-md"
                />
                <button
                    type="submit"
                    className="px-4 py-2 bg-lightblue-300 rounded-md hover:bg-lightblue-400"
                >
                    追加
                </button>
            </form>

            {/* 店舗一覧 */}
            <h2 className="text-xl font-semibold mb-2">店舗一覧</h2>
            <ul className="space-y-2">
                {stores.map((store) => (
                    <li
                        key={store.id}
                        className="p-4 bg-white shadow-md rounded-md flex justify-between items-center"
                    >
                        <div>
                            <p className="font-bold">{store.店舗名}</p>
                            <p className="text-sm">税区分: {store.taxType}</p>
                            <p className="text-sm">住所: {store.住所}</p>
                            <p className="text-sm">備考: {store.備考}</p>
                            <p className="text-sm">ステータス: {store.status}</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setEditTarget(store)}
                                className="px-3 py-1 bg-yellow-300 rounded-md hover:bg-yellow-400"
                            >
                                編集
                            </button>
                            <button
                                onClick={() => handleDelete(store.id)}
                                className="px-3 py-1 bg-red-300 rounded-md hover:bg-red-400"
                            >
                                削除
                            </button>
                        </div>
                    </li>
                ))}
            </ul>

            {/* 編集モーダル */}
            {editTarget && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white p-6 rounded-md shadow-md w-96 space-y-4">
                        <h2 className="text-lg font-semibold mb-2">
                            店舗編集：{editTarget.店舗名}
                        </h2>
                        <label className="block text-sm font-medium mb-1">店舗名</label>
                        <input
                            type="text"
                            name="店舗名"
                            value={editTarget.店舗名}
                            onChange={(e) =>
                                setEditTarget((prev) => ({ ...prev, 店舗名: e.target.value }))
                            }
                            className="w-full p-3 border rounded-md"
                        />

                        <label className="block text-sm font-medium mb-1">税区分</label>
                        <select
                            name="taxType"
                            value={editTarget.taxType}
                            onChange={(e) =>
                                setEditTarget((prev) => ({ ...prev, taxType: e.target.value }))
                            }
                            className="w-full p-3 border rounded-md"
                        >
                            <option value="税込">税込</option>
                            <option value="税抜">税抜</option>
                        </select>

                        <label className="block text-sm font-medium mb-1">住所</label>
                        <input
                            type="text"
                            name="住所"
                            value={editTarget.住所}
                            onChange={(e) =>
                                setEditTarget((prev) => ({ ...prev, 住所: e.target.value }))
                            }
                            className="w-full p-3 border rounded-md"
                        />

                        <label className="block text-sm font-medium mb-1">備考</label>
                        <input
                            type="text"
                            name="備考"
                            value={editTarget.備考}
                            onChange={(e) =>
                                setEditTarget((prev) => ({ ...prev, 備考: e.target.value }))
                            }
                            className="w-full p-3 border rounded-md"
                        />
                        <select
                            name="status"
                            value={editTarget.status}
                            onChange={(e) =>
                                setEditTarget((prev) => ({ ...prev, status: e.target.value }))
                            }
                            className="w-full p-3 border rounded-md"
                        >
                            <option value="有効">有効</option>
                            <option value="無効">無効</option>
                        </select>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setEditTarget(null)}
                                className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleEditSubmit}
                                className="px-4 py-2 bg-lightblue-300 rounded-md hover:bg-lightblue-400"
                            >
                                保存
                            </button>
                        </div>
                    </div>
                </div>
            )}
            </main>
        </div>
    );
}

export default StoreAdmin;