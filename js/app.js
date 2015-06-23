"use strict";

/*
 * Crystal revenue calculator for Cookie Run.
 * Code by Robert Sebescen aka pgrobban
 * Thanks to @Kevsuc in the Cookie Run Wiki for inspiration :)
 */

/*
 * Variable prefix Naming convention:
 * n = number
 * s = string
 * b = boolean
 * o = object
 * a = array
 * fn = function
 * e = jQuery element
 */

// main entry point
var oApp = {};

$(document).ready(function () {

    oApp.data = null;

    // fetch the data from the JSON file.
    $.ajax({
        url: "data/treasuredata.json",
        async: false,
        success: function (data) {
            oApp.data = data;
        },
        error: function () {
            alert("Error: Couldn't load treasure data. If you see this, notify me");
        }
    });

    oApp.fnGenerateTreasureTables();
    $("select").on("change", oApp.fnRecalculate);
});

oApp.fnGenerateTreasureTables = function () {
    oApp.fnGenerateTreasureTable("cookieTreasuresTable", oApp.data.cookieTreasures);
    oApp.fnGenerateTreasureTable("petTreasuresTable", oApp.data.petTreasures);
    oApp.fnGenerateTreasureTable("levelTreasuresTable", oApp.data.levelTreasures);
    oApp.fnGenerateTreasureTable("eventTreasuresTable", oApp.data.eventTreasures);
    oApp.fnGenerateCertificatesTable();
    oApp.fnGenerateChestTreasuresTable();
};


oApp.fnGenerateTreasureRow = function (sTableID, sTreasureName, bGenerateDeleteButton) {
    // Generate img src attribute. ugh, ugly. we have to escape apostrophes and we can't use colons for file names, so I replaced them with a dash
    var sImgSrc = sTreasureName.replace("'", "&#39;").replace(":", "-") + ".png";
    //console.log(sImgSrc);
    var eTr = $("<tr class='treasureRow'></tr>");

    var eImg = $(sprintf("<img src='img/%s' alt='%s'/>", sImgSrc, sTreasureName));
    var eIconTD = $("<td></td>");
    eIconTD.append(eImg);
    eTr.append(eIconTD);
    $("#" + sTableID).append(eTr);

    var nameTD = $(sprintf("<td>%s</td>", sTreasureName));
    eTr.append(nameTD);

    var eSelectTD = $("<td></td>");
    var eSelect = $("<select class='level'></select>");
    eSelect.append("<option value='-1' selected>Select level/Don't have</option>");
    eSelectTD.append(eSelect);
    eTr.append(eSelectTD);

    for (var j = 0; j <= 9; j++)
    {
        eSelect.append(sprintf("<option value='%d'>+%d</option>", j, j));
    }
    
    if (bGenerateDeleteButton)
    {
        var eDeleteTD = $("<td></td>");
        var eDeleteButton = $('<button type="button" class="btn btn-default btn-sm"><span class="glyphicon glyphicon-trash"></span> </button>');
        eDeleteButton.on("click", function() {
            eDeleteButton.closest("tr").remove();
            oApp.fnRecalculate();
        });
        eDeleteTD.append(eDeleteButton);
        eTr.append(eDeleteTD);
    }
}

oApp.fnGenerateTreasureTable = function (sTableID, oTreasures) {
    $("#" + sTableID).append("<th class='col-md-1'></th>"); // icon
    $("#" + sTableID).append("<th class='col-md-2'>Name</th>");
    $("#" + sTableID).append("<th class='col-md-2'>Level</th>");

    for (var treasureName in oTreasures)
    {
        oApp.fnGenerateTreasureRow(sTableID, treasureName);
    }
};

oApp.fnRecalculate = function () {

    var nMaxCrystals = 0, nAvgCrystals = 0;

    $.each($(".treasureRow"), function (index, value)
    {
        var sTreasureName = $(value).find("td").eq(1).text();
        //console.log($(value).find("select").val());
        var nLevel = $(value).find("select").val(); // the level of the player's treasure or -1 if the player doesn't have it

        if (nLevel > -1)
        {
            var crystalsPerDay = oApp.findTreasureByName(sTreasureName).crystalsPerDay;
            nMaxCrystals += crystalsPerDay;
            var chance = oApp.findTreasureByName(sTreasureName).chance[nLevel] / 100;
            nAvgCrystals += crystalsPerDay * chance;
        }
    });

    $("#maxCrystals").text(nMaxCrystals);
    $("#avgCrystals").text(Math.round(nAvgCrystals * 100) / 100);
};


oApp.fnGenerateChestTreasuresTable = function ()
{
    // populate select
    for (var sTreasureName in oApp.data.chestTreasures)
        $("#chestTreasureSelect").append(sprintf("<option>%s</option>", sTreasureName));
    $("#chestTreasureSelect").on("change", function () {
        oApp.fnGenerateTreasureRow("chestTreasuresTable", $("#chestTreasureSelect").val(), true);
        $("#chestTreasureSelect").val("-1");
        $("#chestTreasuresTable tbody select").on("change", oApp.fnRecalculate); // shouldn't be necessary but for some reason...
    });
}


oApp.fnGenerateCertificatesTable = function () {
    // populate select
    for (var i = 0; i < 10; i++)
        $("#certificateSelect").append($(sprintf("<option>Cookie Run: %dM Points Certificate </option>", i)));
    for (var i = 10; i <= 100; i += 10)
        $("#certificateSelect").append($(sprintf("<option>Cookie Run: %dM Points Certificate </option>", i)));

    // generate treasure data 0-90M
    $('#certificateSelect option').each(function (nIndex) {
        if ($(this).val() !== "-1" && $(this).val() !== "Cookie Run: 100M Points Certificate")
        {
            var sTreasureName = $(this).val();
            oApp.data["certificateTreasures"][sTreasureName] = {};
            oApp.data["certificateTreasures"][sTreasureName].crystalsPerDay = 1;
            // generate chance array
            var aCrystalChance = [];
            // level 0 to 8 are always +1% chance, beginning at 40% for 0M Certificate. 
            // -1 because first option is not valid. means player doesn't have any Certificate Treasure
            for (var i = 0; i <= 8; i++)
                aCrystalChance.push(40 + nIndex + i - 1);
            // level +9 is level 0 + 10, 
            aCrystalChance.push(50 + nIndex - 1);
            oApp.data["certificateTreasures"][sTreasureName].chance = aCrystalChance;
        }
    });
    // 100M is in the data file. special because it's +2% chance from 90M, although we could generate it here as well

    $("#certificateSelect").on('change', function () {
        $("#certificateTreasureTable tbody").empty();
        if ($("#certificateSelect").val() != "-1")
            oApp.fnGenerateTreasureRow("certificateTreasureTable", $("#certificateSelect").val());
        $("#certificateTreasureTable tbody select").on("change", oApp.fnRecalculate); // shouldn't be necessary but for some reason...
    });


};

oApp.findTreasureByName = function (sTreasureName) {
    for (var sTreasureGroup in oApp.data)
    {
        for (var sTreasure in oApp.data[sTreasureGroup])
        {
            if (sTreasureName === sTreasure)
                return oApp.data[sTreasureGroup][sTreasureName];
        }
    }
    return null;
};






