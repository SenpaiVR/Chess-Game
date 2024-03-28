import React, { useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import * as Stockfish from './API/Stockfish'
import { Box, Button, Typography } from '@mui/material'

const initState = {
	game: new Chess(),
	player: 'w',
	orientation: 'white',
}

/**
 *
 * @param {typeof initState} state
 * @param {{type: any, payload: any}} action
 * @returns
 */
function reducer(state, action) {
	switch (action.type) {
		case 'FLIP_BOARD':
			return {
				...state,
				orientation: state.orientation === 'white' ? 'black' : 'white',
			}
		default:
			return state
	}
}

function App() {
	const [state, dispatch] = React.useReducer(reducer, initState)
	const [, updateState] = useState()
	const forceUpdate = React.useCallback(() => updateState({}), [])

	// Stockfish Move
	async function StockMove() {
		const possibleMoves = state.game.moves()

		// exit if game is over
		if (
			state.game.isGameOver() ||
			state.game.isDraw() ||
			possibleMoves.length === 0
		)
			return

		await Stockfish.getBestMove(state.game.fen(), 1).then((move) => {
			state.game.move(move)
			forceUpdate()
		})
	}

	//perform action when piece dropped by user
	function onDrop(sourceSquare, targetSquare) {
		// attempt move
		let move = null
		try {
			move = state.game.move({
				from: sourceSquare,
				to: targetSquare,
				promotion: 'q', // always promote to a queen for example simplicity
			})
		} catch (error) {}

		// illegal move made
		if (move === null) return false
		// valid move made, make computer move
		// setTimeout(makeRandomMove, 200)
		StockMove()
		forceUpdate()
		return true
	}
	return (
		<Box
			height='100vh'
			width='100vw'
			display='flex'
			justifyContent='center'
			alignItems='center'
		>
			<Box width='80vh'>
				<Button
					onClick={() => {
						dispatch({ type: 'FLIP_BOARD' })
					}}
				>
					Flip Board
				</Button>
				<Chessboard
					position={state.game.fen()}
					onPieceDrop={onDrop}
					arePiecesDraggable={state.game.turn() === 'w'}
					boardOrientation={state.orientation}
				/>
				<Typography>
          {/* Get Last Move */}
          Last Move: {state.game.history().pop()}
				</Typography>
			</Box>
		</Box>
	)
}

export default App

