import React, { useEffect, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import * as Stockfish from './API/Stockfish/index'
import {
	Box,
	Button,
	Card,
	CardActions,
	CardContent,
	Grid,
	Typography,
} from '@mui/material'
import * as ChessSound from './sounds/standard'

import eco from './Chess/Openings'

import './App.css'

interface State {
	game: Chess
	player: 'w' | 'b'
	orientation: 'white' | 'black'
	gameHistory: { color: 'w' | 'b'; from: string; to: string }[]
}

const initState: State = {
	game: new Chess(),
	player: 'w',
	orientation: 'white',
	gameHistory: [],
}

const enum ReducerActionType {
	CHANGE_ORIENTATION,
	UPDATE_GAME_HISTORY,
	CLEAR_GAME_HISTORY,
}

type ReducerAction =
	| {
			type: ReducerActionType.CHANGE_ORIENTATION
	  }
	| {
			type: ReducerActionType.UPDATE_GAME_HISTORY
			payload: {
				turn: number
				color: 'w' | 'b'
				from: string
				to: string
			}
	  }
	| {
			type: ReducerActionType.CLEAR_GAME_HISTORY
	  }

function reducer(state: State, action: ReducerAction): State {
	switch (action.type) {
		case ReducerActionType.CHANGE_ORIENTATION:
			return {
				...state,
				orientation: state.orientation === 'white' ? 'black' : 'white',
			}
		case ReducerActionType.UPDATE_GAME_HISTORY:
			if (state.gameHistory.length > action.payload.turn) {
				// if the player is continuing from a historical move
				const newHistory = state.gameHistory.slice(
					0,
					action.payload.turn - 1
				)
				newHistory.push(action.payload)
				return {
					...state,
					gameHistory: newHistory,
				}
			} else {
				return {
					...state,
					gameHistory: [...state.gameHistory, action.payload],
				}
			}
		case ReducerActionType.CLEAR_GAME_HISTORY:
			return {
				...state,
				gameHistory: [],
			}
		default:
			return state
	}
}

export default function App() {
	const [state, dispatch] = React.useReducer(reducer, initState as State)

	const targetRef = useRef<HTMLDivElement>(null)
	const [dimentions, setDimentions] = useState({ width: 0, height: 0 })

	function updateLastMove(lastMove: { from?: string; to?: string }) {
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
		if (lastMove.from && lastMove.to) {
			const from = document.querySelector(
				`[data-square="${lastMove.from}"]`
			)
			const to = document.querySelector(`[data-square="${lastMove.to}"]`)
			if (!from || !to) return
			fromHighlight.parentElement?.removeChild(fromHighlight)
			toHighlight.parentElement?.removeChild(toHighlight)
			from.appendChild(fromHighlight)
			to.appendChild(toHighlight)
		} else {
			fromHighlight.parentElement?.removeChild(fromHighlight)
			toHighlight.parentElement?.removeChild(toHighlight)
		}
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
		} else if (state.game.history().length > 0) {
			ChessSound.Move.play()
		} else {
			ChessSound.GenericNotify.play()
		}
	}

	const [, updateState] = useState<any>()
	const forceUpdate = React.useCallback(() => updateState({}), [])

	useEffect(() => {
		updateLastMove({
			from:
				state.gameHistory[state.game.history().length - 1]?.from ||
				undefined,
			to:
				state.gameHistory[state.game.history().length - 1]?.to ||
				undefined,
		})
	}, [state.game.board()])

	useEffect(() => {
		renderSound()
	}, [state.game.turn()])

	useEffect(() => {
		window.addEventListener('resize', () => {
			setDimentions({
				width: targetRef.current?.clientWidth || 0,
				height: targetRef.current?.clientHeight || 0,
			})
		})
	}, [targetRef])

	return (
		<Box height='100vh'>
			<Grid
				container
				height='100%'
				maxWidth='100%'
				alignItems='center'
				sx={{
					maxWidth: '80%',
					mx: 'auto',
				}}
			>
				{/* <Grid
					item
					md={1}
					width='100%'
					height='100%'
					display='flex'
					justifyContent='center'
					alignItems='center'
				>
					<Box
						height={`${dimentions.height * 0.99}px`}
						width='100%'
					>
						<EvalBar eval={0} />
					</Box>
				</Grid> */}
				<Grid
					ref={targetRef}
					item
					md={7}
					width='100%'
					height='100%'
					display='flex'
					justifyContent='center'
					alignItems='center'
				>
					<GameScreen
						state={state}
						dispatch={dispatch}
						height={dimentions.height}
						forceUpdate={forceUpdate}
					/>
				</Grid>
				<Grid
					md={5}
					item
					width='100%'
					height='100%'
					display='flex'
					justifyContent='center'
					alignItems='center'
				>
					<GameControls
						state={state}
						dispatch={dispatch}
						height={dimentions.height}
						forceUpdate={forceUpdate}
						updateLastMove={updateLastMove}
					/>
				</Grid>
			</Grid>
		</Box>
	)
}

function GameScreen(props: {
	state: State
	dispatch: React.Dispatch<ReducerAction>
	forceUpdate: () => void
	height?: number
}) {
	const { state, dispatch, height, forceUpdate } = props

	// const [evalNum, setEvalNum] = useState(0)

	function onDrop(sourceSquare: string, targetSquare: string) {
		let move = null
		try {
			move = state.game.move({
				from: sourceSquare,
				to: targetSquare,
			})
			dispatch({
				type: ReducerActionType.UPDATE_GAME_HISTORY,
				payload: {
					turn: state.game.history().length,
					color: state.player,
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

	async function StockMove() {
		const possibleMoves = state.game.moves()

		if (
			state.game.isGameOver() ||
			state.game.isDraw() ||
			possibleMoves.length === 0
		)
			return

		await Stockfish.getBestMove(state.game.fen(), 1).then((move) => {
			dispatch({
				type: ReducerActionType.UPDATE_GAME_HISTORY,
				payload: {
					turn: state.game.history().length,
					color: state.game.turn() as 'w' | 'b',
					from: move.substring(0, 2),
					to: move.substring(2, 4),
				},
			})
			state.game.move(move) // "ex: move = a2a3"
			forceUpdate()
		})
	}

	useEffect(() => {
		forceUpdate()
	}, [props.height])

	return (
		<Box width='100%'>
			<Box
				maxWidth={height ? `${height * 0.99}px` : undefined}
				mr={2}
			>
				<Chessboard
					position={state.game.fen()}
					onPieceDrop={onDrop}
					arePiecesDraggable={state.game.turn() === 'w'}
					boardOrientation={state.orientation}
				/>
			</Box>
		</Box>
	)
}

function GameControls(props: {
	state: State
	dispatch: React.Dispatch<ReducerAction>
	height?: number
	forceUpdate: () => void
	updateLastMove: (lastMove: { from: string; to: string }) => void
}) {
	const { state, dispatch, forceUpdate, updateLastMove } = props
	const [undoHistory, setUndoHistory] = useState<string[]>([])
	const [hint, setHint] = useState<{ from: string; to: string }>({
		from: '',
		to: '',
	})

	const gameOptions = {
		NewGame: () => {
			state.game.reset()
			dispatch({ type: ReducerActionType.CLEAR_GAME_HISTORY })
			forceUpdate()
		},
		Undo: () => {
			// Get Bot and Player Move
			const BotMove =
				state.game.history()[state.game.history().length - 1]
			const PlayerMove =
				state.game.history()[state.game.history().length - 2]

			if (!BotMove || !PlayerMove) return
			// Remove the last move from the game history
			state.game.undo()
			state.game.undo()

			const newUndoHistory = [...undoHistory, PlayerMove, BotMove]
			setUndoHistory(newUndoHistory)

			forceUpdate()
		},
		Redo: () => {
			// Get Bot and Player Move
			const BotMove = undoHistory[undoHistory.length - 1]
			const PlayerMove = undoHistory[undoHistory.length - 2]

			if (!BotMove || !PlayerMove) return
			// Remove the last move from the game history
			state.game.move(PlayerMove)
			state.game.move(BotMove)

			let newUndoHistory = [...undoHistory]
			newUndoHistory = newUndoHistory.filter(
				(move) => move !== PlayerMove
			)
			newUndoHistory = newUndoHistory.filter((move) => move !== BotMove)
			setUndoHistory(newUndoHistory)
			forceUpdate()
		},
		hint: () => {
			console.log(hint)
		},
	}

	function pgnToTurns(pgn: string) {
		// Remove any line breaks or extra spaces
		const cleanedPgn = pgn.replace(/\s+/g, ' ').trim()

		// Split the cleaned PGN by move numbers (e.g., "1. e4 d5 2. d3" becomes ["1. e4 d5", "2. d3"])
		const moveSections = cleanedPgn.split(/\d+\./).filter(Boolean)

		// Extract the moves from each section
		const moves = moveSections.map((section) => {
			const sectionMoves = section.trim().split(' ')
			const whiteMove = sectionMoves[0]
			const blackMove = sectionMoves[1]
			return { whiteMove, blackMove }
		})
		return moves
	}

	const [openings, setOpenings] = useState(
		eco
			.filter((opening) => opening.fen === state.game.fen())
			.map((opening) => opening.name)
	)

	useEffect(() => {
		if (state.game.turn() === state.player) {
			Stockfish.getBestMove(state.game.fen(), 1).then((move) => {
				const from = move.substring(0, 2)
				const to = move.substring(2, 4)
				setHint({ from, to })
			})
		}
		updateLastMove({
			from: state.game.history().pop()?.substring(0, 2) || '',
			to: state.game.history().pop()?.substring(2, 4) || '',
		})

		setOpenings(
			eco
				.filter((opening) => opening.fen === state.game.fen())
				.map((opening) => opening.name)
		)
	}, [state.game.turn()])

	return (
		<Card
			sx={{
				p: 2,
				height: '85%',
				flexGrow: 1,
			}}
		>
			<CardContent
				sx={{
					height: '90%',
					overflow: 'auto',
				}}
			>
				<Box
					display='flex'
					flexDirection='column'
					p={2}
				>
					<Grid md={12}>{openings.join(', ')}</Grid>
					{pgnToTurns(state.game.pgn()).map((_, i) => (
						<Grid
							key={i}
							container
						>
							<Grid
								item
								md={2}
							>
								<Typography textAlign='center'>
									{i + 1}.
								</Typography>
							</Grid>
							<Grid
								item
								md={1.5}
							>
								{(state.game.history()[2 * i] ===
									state.game.history()[
										state.game.history().length - 1
									] && (
									<Card elevation={10}>
										<Typography textAlign='center'>
											{state.game.history()[2 * i]}
										</Typography>
									</Card>
								)) || (
									<Typography textAlign='center'>
										{state.game.history()[2 * i]}
									</Typography>
								)}
							</Grid>
							<Grid
								item
								md={2}
							>
								{(state.game.history()[2 * i + 1] ===
									state.game.history()[
										state.game.history().length - 1
									] && (
									<Card
										elevation={10}
										sx={{
											// Top and bottom boarder
											borderTop: '2px solid gray',
											borderBottom: '2px solid gray',
										}}
									>
										<Typography textAlign='center'>
											{state.game.history()[2 * i + 1]}
										</Typography>
									</Card>
								)) || (
									<Typography textAlign='center'>
										{state.game.history()[2 * i + 1]}
									</Typography>
								)}
							</Grid>
						</Grid>
					))}
				</Box>
			</CardContent>
			<CardActions
				sx={{
					height: '10%',
					justifyContent: 'space-around',
				}}
			>
				{[
					{ label: 'New Game', action: gameOptions.NewGame },
					{ label: 'Undo', action: gameOptions.Undo },
					{ label: 'Redo', action: gameOptions.Redo },
					{ label: 'Hint', action: gameOptions.hint },
				].map((option, i) => (
					<Button
						key={i}
						onClick={option.action}
						disabled={state.game.turn() !== state.player}
					>
						{option.label}
					</Button>
				))}
			</CardActions>
		</Card>
	)
}

// function EvalBar(props: { eval: number }) {
// 	return (
// 		<Box
// 			sx={{
// 				height: '100%',
// 				width: '100%',
// 				backgroundColor: 'yellow',
// 			}}
// 		>
// 			<Box />
// 		</Box>
// 	)
// }

