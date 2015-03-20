var fs = require('fs-extra');
var sprintf = require('sprintf');

module.exports = function (app) {
    var comic_url_pattern = /(\d{4})\/(\d{2})\/(\d{2})\/$/;
    var max_num_transcriptions = 10;

    function isCorrectSolution(solution, num_1, num_2) {
        if (solution === 'doof') {
            return true;
        }

        return parseInt(solution) === parseInt(num_1) + parseInt(num_2);
    }

    function parseComicDate(params) {
        var year = parseInt(params[0]);
        var month = parseInt(params[1]);
        var day = parseInt(params[2]);

        return new Date(Date.UTC(year, month-1, day));
    }

    function saveTranscription(comic_date, data, _) {
        var file_path = sprintf('data/transcriptions/%(year)04d/%(month)02d/%(day)02d/', {
            year: comic_date.getFullYear(),
            month: comic_date.getMonth()+1,
            day: comic_date.getDate()
        });

        fs.mkdirp(file_path, _);

        if (fs.readdir(file_path, _).length + 1 > max_num_transcriptions) {
            throw new Error('Too many transcriptions for ' + comic_date.toISOString().substr(0, 10) + '!');
        }

        var now = new Date(Date.now());
        var file_name = file_path + now.toISOString() + '.json';
        fs.writeFile(file_name, JSON.stringify({
                name: data.name,
                text: data.text
            }, null, 4) + '\n',
            _
        );
    }

    app.get(comic_url_pattern, function (req, res, _) {
        var comic_date = parseComicDate(req.params);
        var comic_url = comic_date.getFullYear() + "/fred_" + comic_date.toISOString().substr(0, 10) + ".png";
        res.render('transcribe.html', {app: req.app, comic_url: comic_url});
    });

    app.post(comic_url_pattern, function (req, res, _) {
        var comic_date = parseComicDate(req.params);
        var result = {
            errors: [],
            submitted: false
        };

        if (!isCorrectSolution(req.body.solution, req.body.num_1, req.body.num_2)) {
            result.errors.push('wrong_solution');
        }

        if (!req.body.transcription) {
            result.errors.push('transcription_missing');
        }


        if (result.errors.length == 0) {
            try {
                saveTranscription(comic_date, {
                    name: req.body.name,
                    text: req.body.transcription
                }, _);
                result.submitted = true;
            }
            catch (e) {
                console.log(e.stack);
                result.errors.push('could_not_save');
            }
        }

        res.render('transcribe.html', {app: req.app, input: req.body, result: result});
    });
};
