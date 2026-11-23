
(function () {
    "use strict";

    var TAG = "[All Starting Teams]";

    var originalCreateList =
        window.gml_Script_s_create_starting_teams_list;

    if (typeof originalCreateList !== "function") {
        console.error(TAG, "Could not find s_create_starting_teams_list.");
        return;
    }

    // Build a list containing every team's UID.
    window.gml_Script_s_create_starting_teams_list =
        function (_inst, _other) {
            try {
                var manager = yyInst(_inst, _other, global.gmlg_m);
                var teamList = manager.gmlteamlist;

                var selectableTeams = __yy_gml_array_create([]);
                var count = ds_list_size(teamList);

                for (var i = 0; i < count; i++) {
                    var team = ds_list_find_value(teamList, i);

                    if (team == null) continue;

                    var uid = ds_map_find_value(team, "uid");

                    if (uid == null || uid === -1) continue;

                    array_push(selectableTeams, uid);
                }

                console.log(
                    TAG,
                    "Added " + array_length(selectableTeams) +
                    " teams to the starting-team list."
                );

                return selectableTeams;

            } catch (error) {
                console.error(TAG, "Failed to build team list:", error);
                return originalCreateList.apply(this, arguments);
            }
        };

    // Bypass the game's starting-team restrictions.
    window.gml_Script_s_is_starting_team_selectable =
        function (_inst, _other, teamUID) {
            return true;
        };

    console.log(TAG, "Starting-team restrictions disabled.");
    console.log(TAG, "All teams should now be selectable.");

})();
