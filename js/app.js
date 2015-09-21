"use strict";

/*
 * Crystal revenue calculator for Cookie Run.
 * Code by Robert Sebescen aka pgrobban
 */

/*
 * Variable prefix Naming convention:
 * n = number
 * s = string
 * b = boolean
 * o = object
 * a = array
 * ao = array of objects
 * fn = function
 * e = jQuery element
 */

// main entry point
var oApp = {};

$(document).ready(function () {

    oApp.oData = null;
    oApp.aoPlayerTreasures = null;

    $("body").on("change", "select", oApp.fnRecalculate);
    $("#certificateSelect").on("change", function () {
        $("#certificateTreasureTable tbody").empty();
        if ($("#certificateSelect").val() !== "-1")
            oApp.fnGenerateTreasureRow("certificateTreasureTable", $("#certificateSelect").val());
    });

    // fetch the data from the JSON file. When finished, start generating tables. 
    $.ajax({
        url: "data/treasuredata.json",
        success: function (oData) {
            oApp.oData = oData;
            oApp.fnGenerateTreasureTables();
            oApp.fnGetLocalStorageData();
        },
        error: function () {
            alert("Error: Couldn't load treasure data or something went wrong when parsing the file.");
        }
    });

});

/**
 * Main flow of generating the tables.
 */
oApp.fnGenerateTreasureTables = function () {
    oApp.fnGenerateTreasureTable("cookieTreasuresTable", Object.keys(oApp.oData.cookieTreasures));
    oApp.fnGenerateTreasureTable("petTreasuresTable", Object.keys(oApp.oData.petTreasures));
    oApp.fnGenerateTreasureTable("levelTreasuresTable", Object.keys(oApp.oData.levelTreasures));
    oApp.fnGenerateTreasureTable("eventTreasuresTable", Object.keys(oApp.oData.eventTreasures));
    oApp.fnGenerateCertificatesTable();
    oApp.fnGenerateChestTreasuresTable();
};

/**
 * Given a table ID and an array of treasure names, generate rows in the table
 * populated with treasures that have the names from the array.
 * @param {string} sTableID
 * @param {array} aTreasures
 * @returns {undefined}
 */
oApp.fnGenerateTreasureTable = function (sTableID, aTreasures) {
    $("#" + sTableID).append("<th class='col-xs-1'></th>"); // icon
    $("#" + sTableID).append("<th class='col-xs-3'>Name</th>");
    $("#" + sTableID).append("<th class='col-xs-3'>Level</th>");

    aTreasures.forEach(function (sTreasureName)
    {
        oApp.fnGenerateTreasureRow(sTableID, sTreasureName, false);
    });
};

/**
 * Generate a table row at the given tableID, populating it with the image, name
 * and a select box for level of the treasure with the name sTreasureName. 
 * Images are assumed to be in the img/ folder and to have the same names as the
 * treasure, with colons (:) replaced by a dash (-). You may also pass a third
 * parameter to specify whether or not to generate a column that contains a
 * delete row button (default is false).
 * @param {string} sTableID
 * @param {string} sTreasureName
 * @param {boolean} bGenerateDeleteButton
 * @returns {undefined}
 */
oApp.fnGenerateTreasureRow = function (sTableID, sTreasureName, bGenerateDeleteButton) {
    var eTr = $('<tr class="treasureRow" data-treasure-name="' + sTreasureName + '"></tr>');

    // Generate img src attribute. ugh, ugly. we have to escape apostrophes and we can't use colons for file names, so I replaced them with a dash
    var sImgSrc = oApp.getImgSrc(sTreasureName);

    var eImg = $(sprintf("<img class='img-responsive' src='%s' alt='%s'/>", sImgSrc, sTreasureName));
    var eIconTD = $("<td></td>");
    eIconTD.append(eImg);
    eTr.append(eIconTD);

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
        eDeleteButton.on("click", function () {
            eDeleteButton.closest("tr").remove();
            oApp.fnRecalculate();
        });
        eDeleteTD.append(eDeleteButton);
        eTr.append(eDeleteTD);
    }
    $("#" + sTableID).append(eTr);
};

oApp.getImgSrc = function (sTreasureName)
{
    return sprintf("img/%s.png", sTreasureName.replace("'", "&#39;").replace(":", "-"));
}

/**
 * Dynamically populate the certificateSelect <select> tag and generate treasure
 * data to aApp.oData. Generate a table row when the user has selected a
 * ceritficate in the select box.
 * There are 21 treasures of this kind, each with a higher "tier" than the last.
 * The "tiers" are each million from 0 to 10 inclusive, followed by every 10
 * million up to 100 million. (The 100M certificate treasure has been added to
 * the data file).
 * Chances for certificate treasures follow a formula: they all can generate one crystal,
 * with a chance starting at 40% for 0M and adding 1% for each level (except +2% for +9) 
 * and +1% for each tier.
 */
oApp.fnGenerateCertificatesTable = function () {
    // populate select
    for (var i = 0; i < 10; i++)
        $("#certificateSelect").append($(sprintf("<option>Cookie Run: %dM Points Certificate </option>", i)));
    for (var i = 10; i <= 100; i += 10)
        $("#certificateSelect").append($(sprintf("<option>Cookie Run: %dM Points Certificate </option>", i)));

    // generate treasure data and add to oApp.oData
    $('#certificateSelect option').each(function (nIndex) {
        if ($(this).val() !== "-1" && $(this).val() !== "Cookie Run: 100M Points Certificate")
        {
            var sTreasureName = $(this).val();
            oApp.oData["certificateTreasures"][sTreasureName] = {};
            oApp.oData["certificateTreasures"][sTreasureName].crystals = 1;
            // generate chance array
            var aCrystalChance = [];
            // level 0 to 8 are always +1% chance, beginning at 40% for 0M Certificate. 
            // -1 because first option is not valid. means player doesn't have any Certificate Treasure
            for (var i = 0; i <= 8; i++)
                aCrystalChance.push(40 + nIndex + i - 1);
            // level +9 is level 0 + 10, 
            aCrystalChance.push(50 + nIndex - 1);
            oApp.oData["certificateTreasures"][sTreasureName].chance = aCrystalChance;
        }
    });
    // 100M is in the data file. special because it's +2% chance from 90M, although we could generate it here as well


};

/**
 * Populate the chest treasure <select> tag based on what treasures are in the
 * data file. When the user selects a treasure from this select box, generate a
 * table row that will be added to the chestTreasureSelect table. Then, reset
 * the select box so that the user can choose multiple treasures of the same kind.
 */
oApp.fnGenerateChestTreasuresTable = function ()
{
    // populate select
    for (var sTreasureName in oApp.oData.chestTreasures)
        $("#chestTreasureSelect").append(sprintf("<option>%s</option>", sTreasureName));

    // generate table row
    $("#chestTreasureSelect").on("change", function () {
        oApp.fnGenerateTreasureRow("chestTreasuresTable", $("#chestTreasureSelect").val(), true);
        $("#chestTreasureSelect").val("-1"); // reset the selection - currently doesn't work in Chrome for iOS
        $("#chestTreasuresTable tbody select").on("change", oApp.fnRecalculate); // shouldn't be necessary but for some reason...
    });
};

/**
 * Recalculates the theoretical maximum crystals per day, expected (average) number of 
 * Crystals per day, and sets the values in the text of the maxCrystals and avgCrystals
 * elements to reflect these values.
 */
oApp.fnRecalculate = function () {

    var nMaxCrystals = 0, nAvgCrystalsPerDay = 0;

    $.each($(".treasureRow"), function (index, value)
    {
        var sTreasureName = $(value).find("td").eq(1).text();
        var nLevel = $(value).find("select").val(); // the level of the player's treasure or -1 if the player doesn't have it

        if (nLevel > -1)
        {
            var nCrystals = oApp.fnFindTreasureByName(sTreasureName).crystals;
            nMaxCrystals += nCrystals;
            var chanceForCurrentLevel = oApp.fnFindTreasureByName(sTreasureName).chance[nLevel] / 100;
            nAvgCrystalsPerDay += nCrystals * chanceForCurrentLevel;
        }
    });

    $("#maxCrystals").text(nMaxCrystals);
    $("#avgCrystals").text(Math.round(nAvgCrystalsPerDay * 100) / 100);

    oApp.fnSaveLocalData();

    oApp.fnMakePlayerTreasureDB();
    oApp.fnDecideNBestTreasuresForPlayerToUpgrade(5);
};

/**
 * Given a name, find the treasure object with this name. Returns null if there
 * is no treasure with the given name.
 * TODO: caching to speed up lookup
 * @param {type} sTreasureName
 * @returns {Object}
 */
oApp.fnFindTreasureByName = function (sTreasureName) {
    for (var sTreasureGroup in oApp.oData)
    {
        for (var sTreasure in oApp.oData[sTreasureGroup])
        {
            if (sTreasureName === sTreasure)
                return oApp.oData[sTreasureGroup][sTreasureName];
        }
    }
    return null;
};


// beta stuff

/**
 * Generate an array aApp.aoPlayerTreasures containing all of the player's treasures
 */
oApp.fnMakePlayerTreasureDB = function ()
{
    oApp.aoPlayerTreasures = [];
    $(".treasureRow").each(function (index, value)
    {
        var nLevel = $(value).find("select").val();
        if (nLevel > -1)
        {
            var oTreasure = {};
            oTreasure.nLevel = parseInt(nLevel);
            oTreasure.sTreasureName = $(value).find("td").eq(1).text();

            var nCrystals = oApp.fnFindTreasureByName(oTreasure.sTreasureName).crystals;
            oTreasure.nCrystals = nCrystals;
            var nChanceForCurrentLevel = oApp.fnFindTreasureByName(oTreasure.sTreasureName).chance[nLevel] / 100;
            oTreasure.nChanceForCurrentLevel = nChanceForCurrentLevel;
            oTreasure.nAverageCrystalsPerDay = nCrystals * nChanceForCurrentLevel;
            oApp.aoPlayerTreasures.push(oTreasure);
        }
    });
}

oApp.fnDecideNBestTreasuresForPlayerToUpgrade = function (nHowMany)
{
    var aoPlayerTreasuresCopy = oApp.aoPlayerTreasures.slice();
    // first remove all treasures of level +9 cus we can't upgrade them
    for (var i = aoPlayerTreasuresCopy.length - 1; i >= 0; i--)
    {
        if (aoPlayerTreasuresCopy[i].nLevel === 9)
            aoPlayerTreasuresCopy.splice(i, 1);
    }

    // next, calculate profit margin to next level
    aoPlayerTreasuresCopy.forEach(function (oTreasure) {
        var nCurrentCrystalsPerDay = oTreasure.nAverageCrystalsPerDay;
        //console.log(nCurrentCrystalsPerDay);
        var nCrystalsPerDayAfterUpgrade = oTreasure.nCrystals * oApp.fnFindTreasureByName(oTreasure.sTreasureName).chance[oTreasure.nLevel + 1] / 100;
        oTreasure.nCrystalsPerDayAfterUpgrade = nCrystalsPerDayAfterUpgrade;
        //console.log(nCrystalsPerDayAfterUpgrade);
    });
    aoPlayerTreasuresCopy.sort(oApp.fnUpgradeSort);
    //console.log(aoPlayerTreasuresCopy);

    // generate upgrades table
    $("#upgradePathTable tbody").empty();


    if (aoPlayerTreasuresCopy.length === 0)
        $("#upgradePathTable tbody").append("<td colspan=4>Nothing to upgrade</td>");
    else
    {
        for (var i = 0; i < nHowMany && i < aoPlayerTreasuresCopy.length; i++)
        {
            var oTreasure = aoPlayerTreasuresCopy[i];
            oApp.fnGenerateUpgradeTableRow(oTreasure.sTreasureName, oTreasure.nLevel, oTreasure.nAverageCrystalsPerDay, oTreasure.nCrystalsPerDayAfterUpgrade);
        }
    }
};

oApp.fnUpgradeSort = function (a, b) {
    // can't do oneliner thanks to IE. http://www.zachleat.com/web/array-sort/

    var x = a["nCrystalsPerDayAfterUpgrade"];
    var y = b["nCrystalsPerDayAfterUpgrade"];
    if (x < y)
        return 1;
    if (x > y)
        return -1;
    return 0;
};


oApp.fnGenerateUpgradeTableRow = function (sTreasureName, nCurrentLevel, nAverageCrystalsPerDay, nCrystalsPerDayAfterUpgrade)
{
    var eTr = $("<tr class='treasureRow'></tr>");

    var eIconTd = $("<td></td>");
    var sImgSrc = oApp.getImgSrc(sTreasureName);
    var eImg = $("<img class='img-responsive' src='" + sImgSrc + "'/>");
    eIconTd.append(eImg);
    eTr.append(eIconTd);

    eTr.append("<td>" + sTreasureName + "</td>");
    eTr.append(sprintf("<td>+%d &rarr; +%d</td>", nCurrentLevel, nCurrentLevel + 1));
    eTr.append(sprintf("<td>%f &rarr; %f</td>", Math.round(nAverageCrystalsPerDay * 100) / 100, Math.round(nCrystalsPerDayAfterUpgrade * 100) / 100));

    $("#upgradePathTable").append(eTr);
};

// get saved data

oApp.fnGetLocalStorageData = function () {
    if (typeof localStorage === 'undefined') {
        alert("Your browser does not support local storage. This means that you can still use the app, but your data will not be saved after you close the browser.");
        return;
    }

    // $('tr[data-treasure-name="Prophet Cookie\'s Majestic Beard"] select').val("3");


    if (typeof localStorage.oPlayerUniqueTreasures === 'undefined') {
        return;
    }

    Object.keys(JSON.parse(localStorage.oPlayerUniqueTreasures)).forEach(function (sTreasureName) {
        //console.log(sTreasureName);
        var iTreasureLevel = JSON.parse(localStorage.oPlayerUniqueTreasures)[sTreasureName];
        $('tr[data-treasure-name="' + sTreasureName + '"] select').val(iTreasureLevel);
    });

    var oPlayerCertificateTreasure = JSON.parse(localStorage.oPlayerCertificateTreasure);
    console.log(oPlayerCertificateTreasure);
    if (!jQuery.isEmptyObject(oPlayerCertificateTreasure)) {
        $("#certificateSelect").val(oPlayerCertificateTreasure["name"]);
        oApp.fnGenerateTreasureRow("certificateTreasureTable", oPlayerCertificateTreasure["name"]);
        $("#certificateTreasureTable select").val(oPlayerCertificateTreasure["level"]);
    }

    var aoPlayerChestTreasures = JSON.parse(localStorage.aoPlayerChestTreasures);

    aoPlayerChestTreasures.forEach(function (oElement, index) {
        oApp.fnGenerateTreasureRow("chestTreasuresTable", oElement["name"], true);
        $("#chestTreasuresTable select").eq(index).val(oElement["level"]);
    });

    oApp.fnRecalculate();
};

oApp.fnSaveLocalData = function () {
    if (typeof localStorage === "undefined")
        return;

    var oPlayerUniqueTreasures = {};
    $("#cookieTreasuresTable tr, #petTreasuresTable tr, #levelTreasuresTable tr, #eventTreasuresTable tr").each(function (index, val) {
        //console.log($(val).data("treasure-name"));
        oPlayerUniqueTreasures[$(val).data("treasure-name")] = $(val).find("select").val();
    });

    localStorage.oPlayerUniqueTreasures = JSON.stringify(oPlayerUniqueTreasures);

    var oPlayerCertificateTreasure = {};
    if ($("#certificateTreasureTable tbody tr"))
    {
        var tr = $("#certificateTreasureTable tbody tr");
        oPlayerCertificateTreasure["name"] = tr.data("treasure-name");
        oPlayerCertificateTreasure["level"] = tr.find("select").val();
    }

    localStorage.oPlayerCertificateTreasure = JSON.stringify(oPlayerCertificateTreasure);

    var aoPlayerChestTreasures = [];
    $("#chestTreasuresTable tbody tr").each(function (val) {
        var oTreasureToAdd = {};
        oTreasureToAdd["name"] = $(this).data("treasure-name");
        oTreasureToAdd["level"] = $(this).find("select").val();
        aoPlayerChestTreasures.push(oTreasureToAdd);
    });

    localStorage.aoPlayerChestTreasures = JSON.stringify(aoPlayerChestTreasures);
    console.log(JSON.parse(localStorage.aoPlayerChestTreasures));

};






