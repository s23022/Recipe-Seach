export default async function handler(req, res) {
    const { keyword } = req.query;

    if (!keyword) {
        return res.status(400).json({ error: 'キーワードが必要です' });
    }

    const APP_ID = process.env.RAKUTEN_APP_ID; // .env.localに設定すること

    const apiUrl = `https://app.rakuten.co.jp/services/api/Recipe/CategoryRanking/20170426?applicationId=${APP_ID}&keyword=${encodeURIComponent(keyword)}`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: 'API呼び出しに失敗しました' });
    }
}
