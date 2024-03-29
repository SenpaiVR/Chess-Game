import React, { useEffect, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import * as Stockfish from './API/Stockfish/index'
import { Box, Button, Grid, Typography } from '@mui/material'
import * as ChessSound from './sounds/standard'

import './App.css'

interface State {
	game: Chess
	player: 'w' | 'b'
	orientation: 'white' | 'black'
	lastMove?: {
		from: string
		to: string
	}
}

const initState: State = {
	game: new Chess(),
	player: 'w',
	orientation: 'white',
}

const enum ReducerActionType {
	CHANGE_ORIENTATION,
	SET_LAST_MOVE,
}

type ReducerAction =
	| {
			type: ReducerActionType.CHANGE_ORIENTATION
	  }
	| {
			type: ReducerActionType.SET_LAST_MOVE
			payload: {
				from: string
				to: string
			}
	  }

function reducer(state: State, action: ReducerAction): State {
	switch (action.type) {
		case ReducerActionType.CHANGE_ORIENTATION:
			return {
				...state,
				orientation: state.orientation === 'white' ? 'black' : 'white',
			}
		case ReducerActionType.SET_LAST_MOVE:
			return {
				...state,
				lastMove: action.payload,
			}
		default:
			return state
	}
}

export default function App() {
	const [state, dispatch] = React.useReducer(reducer, initState as State)
	const [, updateState] = useState<any>()
	const forceUpdate = React.useCallback(() => updateState({}), [])

	function updateHighlights() {
		updateLastMove()
	}

	function updateLastMove() {
		let fromHighlight = document.getElementById('from-highlight')
		let toHighlight = document.getElementById('to-highlight')

		if (!fromHighlight) {
			fromHighlight = document.createElement('div')
			fromHighlight.id = 'from-highlight'
			fromHighlight.classList.add('highlight')
			fromHighlight.style.backgroundColor = 'rgb(255, 255, 51)'
		}
		if (!toHighlight) {
			toHighlight = document.createElement('div')
			toHighlight.id = 'to-highlight'
			toHighlight.classList.add('highlight')
			toHighlight.style.backgroundColor = 'rgb(255, 255, 51)'
		}
		const lastMove = state.lastMove
		if (lastMove) {
			const from = document.querySelector(
				`[data-square="${lastMove.from}"]`
			)
			const to = document.querySelector(`[data-square="${lastMove.to}"]`)
			if (!from || !to) return
			fromHighlight.parentElement?.removeChild(fromHighlight)
			toHighlight.parentElement?.removeChild(toHighlight)
			from.appendChild(fromHighlight)
			to.appendChild(toHighlight)
		}
	}

	async function StockMove() {
		const possibleMoves = state.game.moves()

		if (
			state.game.isGameOver() ||
			state.game.isDraw() ||
			possibleMoves.length === 0
		)
			return

		await Stockfish.getBestMove(state.game.fen(), 1).then((move) => {
			state.game.move(move) // "ex: move = a2a3"
			dispatch({
				type: ReducerActionType.SET_LAST_MOVE,
				payload: {
					from: move.substring(0, 2),
					to: move.substring(2, 4),
				},
			})
			forceUpdate()
		})
	}

	function onDrop(sourceSquare: string, targetSquare: string) {
		let move = null
		try {
			move = state.game.move({
				from: sourceSquare,
				to: targetSquare,
			})
			dispatch({
				type: ReducerActionType.SET_LAST_MOVE,
				payload: {
					from: sourceSquare,
					to: targetSquare,
				},
			})
		} catch (error: any) {}

		if (move === null) return false
		forceUpdate()
		setTimeout(StockMove, 1000)
		return true
	}

	function renderSound() {
		if (state.game.isCheckmate()) {
			switch (state.game.turn() == state.player) {
				case true:
					ChessSound.Victory.play()
					break
				case false:
					ChessSound.Defeat.play()
					break
			}
		} else if (state.game.inCheck()) {
			ChessSound.Check.play()
		} else if (state.game.isDraw()) {
			ChessSound.Draw.play()
		} else if (state.game.history().pop()?.includes('x')) {
			ChessSound.Capture.play()
		} else if (state.lastMove) {
			ChessSound.Move.play()
		} else {
			ChessSound.GenericNotify.play()
		}
	}

	useEffect(() => {
		updateHighlights()
		renderSound()
	}, [state.lastMove])

	return (
		<Box
			height='100vh'
			width='100vw'
			display='flex'
			justifyContent='center'
			alignItems='center'
		>
			<Grid container>
				<Grid
					item
					md={8}
					display='flex'
					justifyContent='flex-end'
				></Grid>
				<Grid
					item
					md={4}
				/>
				<Grid
					item
					md={8}
					display='flex'
					justifyContent='center'
					alignItems='center'
				>
					<Box
						display='flex'
						flexDirection='column'
						p={2}
					>
						<Button
							sx={{
								alignSelf: 'end',
							}}
							onClick={() => {
								dispatch({
									type: ReducerActionType.CHANGE_ORIENTATION,
								})
							}}
						>
							Flip Board
						</Button>
						<Chessboard
							boardWidth={700}
							position={state.game.fen()}
							onPieceDrop={onDrop}
							arePiecesDraggable={state.game.turn() === 'w'}
							boardOrientation={state.orientation}
						/>
					</Box>
				</Grid>
				<Grid
					md={4}
					item
				>
					<Box
						display='flex'
						flexDirection='column'
						p={2}
					>
						<Typography variant='h6'>{state.game.pgn()}</Typography>
						<Typography variant='h6'>
							{state.game.isCheck() ? 'Check' : ''}
						</Typography>
					</Box>
				</Grid>
			</Grid>
		</Box>
	)
}

