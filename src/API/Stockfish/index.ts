import axios from 'axios'

const stockfish = axios.create({
	baseURL: 'https://stockfish.online/api/s/v2.php',
})

export async function getBestMove(fen: string, depth: number) {
	try {
		return await stockfish
			.get('/', {
				params: {
					fen,
					depth,
				},
			})
			.then((response) => {
				const { data } = response
				/* {
					"success":true,
					"evaluation":1.36,
					"mate":null,
					"bestmove":"bestmove b7b6 ponder f3e5",
					"continuation":"b7b6 f3e5 h7h6 g5f6 f8f6 d2f3 a7a5 b3c2 g7g5 f1e1 e7d6 e1e2 d8c7 h2h3 a8a7 e2e1 c7g7"
				} */
				const { bestmove } = data
				return bestmove.split(' ')[1]
			})
	} catch (error: any) {
		throw new Error(error)
	}
}
