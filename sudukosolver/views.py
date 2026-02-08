from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render
import json
import time


def sudoku(request):
    return render(request, "suduko.html")


# ---------- SOLVER LOGIC ----------

def find_empty_cell(board):
    for row in range(9):
        for col in range(9):
            if board[row][col] == 0:
                return row, col
    return None


def is_valid(board, row, col, num):
    # check row
    for c in range(9):
        if board[row][c] == num:
            return False

    # check column
    for r in range(9):
        if board[r][col] == num:
            return False

    # check 3x3 block
    start_row = (row // 3) * 3
    start_col = (col // 3) * 3

    for r in range(start_row, start_row + 3):
        for c in range(start_col, start_col + 3):
            if board[r][c] == num:
                return False

    return True


def solve_sudoku(board, stats):
    empty = find_empty_cell(board)
    if not empty:
        return True  # solved

    row, col = empty

    for num in range(1, 10):
        stats["steps"] += 1  # count every attempt

        if is_valid(board, row, col, num):
            board[row][col] = num

            if solve_sudoku(board, stats):
                return True

            board[row][col] = 0  # backtrack

    return False


# ---------- API VIEW ----------

@csrf_exempt
def sudoku_solver_view(request):
    if request.method != "POST":
        return JsonResponse(
            {"success": False, "message": "POST method required"},
            status=405
        )

    try:
        data = json.loads(request.body)
        board = data.get("board")

        if not board or len(board) != 9:
            return JsonResponse(
                {"success": False, "message": "Invalid board format"},
                status=400
            )

        sudoku_board = [row[:] for row in board]

        stats = {"steps": 0}
        start_time = time.perf_counter()

        solved = solve_sudoku(sudoku_board, stats)

        end_time = time.perf_counter()
        time_taken_ms = round((end_time - start_time) * 1000, 2)

        if solved:
            return JsonResponse({
                "success": True,
                "verdict": "solved",
                "steps": stats["steps"],
                "time_taken_ms": time_taken_ms,
                "solution": sudoku_board
            })

        return JsonResponse({
            "success": False,
            "verdict": "unsolved",
            "steps": stats["steps"],
            "time_taken_ms": time_taken_ms,
            "message": "Sudoku cannot be solved"
        })

    except Exception as e:
        return JsonResponse(
            {
                "success": False,
                "verdict": "error",
                "error": str(e)
            },
            status=500
        )
