import { $, component$, Host, useClientEffect$, useMount$, useStore } from '@builder.io/qwik';
import SPOT_STATE from '~/utils/spot-state';

export const NUMBER_OF_MINES = 10;

export const ADJACENT_OPTIONS = new Array(
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
  [1, 0],
  [1, -1],
  [0, -1]
);

type SPOT_INFO = {
  status: SPOT_STATE,
  position: Array<number>,
  exposed: boolean
}

export default component$(() => {
  const state = useStore({
    grid_dimensions: new Array(0, 0),
    grid_values: new Array()
  });

  const get_clear_spots = $(() => {
    return state.grid_values.flat().filter(({ status }) => status === SPOT_STATE.CLEAR);
  });

  const get_all_spots_for_regeneration = $(() => {
    return state.grid_values.flat().filter(({ status, exposed }) => status === SPOT_STATE.CLEAR && !exposed);
  });

  const get_mine_spots = $(() => {
    return state.grid_values.flat().filter(({ status }) => status === SPOT_STATE.MINE);
  });

  const generate_mines = $(async () => {
    const temporary_grid_values = new Array(...state.grid_values);
    for (let i = 0; i < NUMBER_OF_MINES; i++) {
      let p = await get_all_spots_for_regeneration.invoke();
      const random_spot_number = Math.floor(Math.random() * p.length);
      const { position: [row, col] } =  p.at(random_spot_number) ?? { position: [-1, -1 ]};
      if (row < 0 && col < 0) continue;
      const grid_spot_data = temporary_grid_values.at(row - 1).at(col - 1);
      grid_spot_data.status = SPOT_STATE.MINE;
      p = await get_all_spots_for_regeneration.invoke();
      if (p.length <= 0) break;
    }
    state.grid_values = temporary_grid_values;
  });

  const expose_spot_at = $(async (row: number, col: number) => {
    let temporary_grid_values = new Array(...state.grid_values);
    temporary_grid_values.at(row).at(col).exposed = true;
    if (state.grid_values.flat().filter(spot_data => spot_data.exposed).length === 1) await generate_mines.invoke();
    state.grid_values = temporary_grid_values;
  });

  const get_number_of_surrounding_mines = $((row: number, col: number) => {
    return ADJACENT_OPTIONS
      .filter(
        ([row_diff, col_diff]) => {
          const new_row = row + row_diff;
          const new_col = col + col_diff;
          if (new_row < 0 || new_col < 0) return false;
          const { status } = state.grid_values?.at(new_row)?.at(new_col) ?? { status: null };
          return status === SPOT_STATE.MINE;
        }
      ).length;
  });

  const get_surrounding_mines_display = $((number_of_surrounding_mines: number) => {
    return number_of_surrounding_mines < 1 ? "" : number_of_surrounding_mines;
  });

  useMount$(() => {
    state.grid_dimensions = new Array(8, 8);
  });

  useClientEffect$(track => {
    track(state, 'grid_dimensions');
    const [rows, cols] = state.grid_dimensions;
    state.grid_values = new Array(rows)
      .fill(null)
      .map(
        (_, i) => new Array(cols)
          .fill({ status: SPOT_STATE.CLEAR, exposed: false })
          .map((spot_data, j) => ({ ...spot_data, position: new Array(i + 1, j + 1) }))
      );
  });

  return (
    <Host>
      <main
        style={{
          display: "flex",
          "flex-direction": "column"
        }}
      >
        <section
          style={{
            display: "grid",
            gap: "3px",
            "justify-content": "center",
            padding: "25px"
          }}
        >
          {
            state.grid_values.map(
              (row) => (
                <>
                  {
                    row.map(
                      async (spot_state: SPOT_INFO) => {
                        const { status, position: [row, col], exposed } = spot_state;
                        return (
                          <button
                            key={`${row}${col}`}
                            style={{
                              display: "flex",
                              "justify-content": "center",
                              "align-items": "center",
                              border: "2px solid black",
                              cursor: "pointer",
                              width: "30px",
                              height: "30px",
                              "grid-row": row,
                              "grid-column": col,
                              "background-color": !exposed ? "blue" : ""
                            }}
                            onClick$={async () => {
                              await expose_spot_at.invoke(row - 1, col - 1);
                            }}
                          >
                            {
                              exposed ? 
                                (status === SPOT_STATE.MINE ? "X" : 
                                  get_surrounding_mines_display.invoke(
                                    await get_number_of_surrounding_mines.invoke(row - 1, col - 1)
                                  )
                                ) :
                                ""
                            }
                          </button>
                        )
                      }
                    )
                  }
                </>
              )
            )
          }
        </section>
        <section
          style={{
            display: "flex",
            "justify-content": "center"
          }}
        >
          <button
            onClick$={async () => {
              for (const spot_data of await get_mine_spots.invoke()) {
                spot_data.status = SPOT_STATE.CLEAR
              }
              await generate_mines.invoke();
            }}
          >
            Re-generate mines.
          </button>
        </section>
      </main>
    </Host>
  );
});
