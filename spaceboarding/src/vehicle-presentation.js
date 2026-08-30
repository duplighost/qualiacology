// Presentation-only integrators live outside deterministic race state, so a
// restart must reset them explicitly. Kept pure for a Node regression test.
export function resetBoardPresentationState(board) {
  if (!board) return false;
  board.wasAirborne = false;
  board.boardWasActive = false;
  board.lastCrouch = 0;
  board.popPose = 0;
  board.stompPose = 0;
  board.catchPose = 0;
  board.grabPose = 0;
  board.spinPose = 0;
  board.finLag = 0;
  board.hairLag = 0;
  return true;
}
