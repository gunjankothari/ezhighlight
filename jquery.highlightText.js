/*
 * @Author: Gunjan.K
 * @Date:   2016-09-30 16:07:09
 * @Last Modified by:   Gunjan.K
 * @Last Modified time: 2016-11-16 13:06:28
 */


(function(root, factory) {

	if (typeof define === 'function' && define.amd) {
		define(['jquery'], function($) {
			return factory($);
		});
	} else if (typeof exports !== 'undefined') {
		var $ = require('jquery');
		module.exports = factory($);
	} else {
		factory(root.$);
	}

}(this, function($) {

	'use strict';

	$.fn.Highlighter = function(config) {

		var that = this;
		this.keepEvidencesHidden = false;
		this._highlightMap = {}; // Map that holds all the Evidences with a unique key.
		this._highlightDocMap = {}; //Map that holds all Evidences grouped by Documents
		this.addToDOM = {}; // Document number as key and boolean value to show/hide evidences for the document.
		this.config = config;

		//******************************//
		//Highlighting Related Methods.
		//******************************//

		$(window).resize(function() {
			that.reRender();
		});

		this.reset = function() {
			this._highlightMap = {};
			this._highlightDocMap = {};
			//this.addToDOM = false;
			this.reRender();
		};

		this._getParent = function(option) {
			return "#" + option.documentId + " " + this.config.document
		};

		this.addEvidence = function(option, showOnDOM) {

			var that = this;
			//var _parent = option.parent,
			var _parent = this._getParent(option),
				$parent = $(_parent),
				$grandParent = $parent.parent(),
				$evidenceList = $grandParent.find(".evidence_list");

			this._replaceEvidence(option);

			//Creating object for document in _highlightDocMap if not available.
			if (!this._highlightDocMap[option.documentId]) {
				this._highlightDocMap[option.documentId] = {};
				this.addToDOM[option.documentId] = false;
			}

			//Mapping Evidence with Document in _highlightDocMap
			this._highlightDocMap[option.documentId][this._getHighlightMapIndex(option)] = option;

			if (showOnDOM && $evidenceList.length == 0) {
				this.addToDOM[option.documentId] = true;
				$grandParent.append(this._createEvidenceList($parent));
				$evidenceList = $grandParent.find(".evidence_list");
			}

			//Creates mapping of all Evidences with a unique Key.
			this._highlightMap[that._getHighlightMapIndex(option)] = option;

			// For selected text, whenever there is no evidence present in the document
			if (option.id == 'selection_evidence') {
				this.addToDOM[option.documentId] = true;

				// prepare evidence list
				if ($evidenceList.length === 0) {

					$evidenceList = this._createEvidenceList($parent);

					//Appending Evidences to Grand Parent.
					$grandParent.append($evidenceList);
				}

			}

			//Add Evidence to DOM if Document is visible or showOnDOM is true.
			if (showOnDOM || this.addToDOM[option.documentId])
				that.addEvidenceToDiv(option, _parent, $parent, $evidenceList);

		};

		this.addEvidenceToDiv = function(option, _parent, $parent, $evidenceList) {
			_parent = _parent || this._getParent(option);
			$parent = $parent || $(_parent);
			var _searchKey = option.evidence,
				_content_string,
				_original_content_string,
				_tokenized_search_key,
				_tmp_key;

			//If Evidence already exists on DOM, add class of new Evidence.
			if (typeof option.id !== 'undefined' && $evidenceList.find('#' + option.id).length > 0) {
				$evidenceList.find('#' + option.id + " span").addClass(option.class);
				return true;
			}

			var pos;
			if ((typeof this === 'object' && !this.keepEvidencesHidden) || (option.id == 'selection_evidence')) {

				pos = {};

				//Content will come here.
				_original_content_string = _content_string = this._unescape($parent.html()); // Unescape Method is added on 31/3/2016 in order to resolve a bug.

				//Tokenize the string with space.
				_tokenized_search_key = _searchKey.trim().split(" ");

				//Get the First word of Evidence.
				_tmp_key = _tokenized_search_key[0]

				//If the word is less than 3 character, take two words as search parameter.
				if (_tmp_key.length < 3 && _tokenized_search_key.length > 1)
					_tmp_key = _tmp_key + " " + _searchKey.trim().split(" ")[1] || '';

				//Actual begin position - This begin position will be with considration of html tags in between.
				var _beginPosition = this._htmlBegin(_content_string, option.begin, _tmp_key);

				var _beginPositionDifference = _content_string.substring(_beginPosition, _content_string.length - 1).indexOf(_searchKey.trim());


				/****************************************************************/
				//Following code will check the last character if it is < or space.
				var character = "";
				var _spaceFinder = 1;


				do {
					_spaceFinder++;
					_tmp_key += character;
					character = _content_string.substring(_beginPosition + _beginPositionDifference + _tmp_key.length, _beginPosition + _beginPositionDifference + _tmp_key.length + 1);
					//_tmp_key += character;
					if (_spaceFinder > 10)
						break;
				}
				while (character !== " " && character !== "<");

				/****************************************************************/

				//Putting a span before the evidence in content.
				_content_string = _content_string.substring(0, _beginPosition + _beginPositionDifference) + '<span class="_tmp_' + option.name + ' _tmp_span">' + _tmp_key + '</span>' + _content_string.substring(_beginPosition + _beginPositionDifference + _tmp_key.length);

				//Replacing content on DOM in order to get the absolute position of that evidence.
				$parent.html(_content_string);

				var $tmpSpan = $('._tmp_' + option.name + '._tmp_span');

				//To set the same css to temporary div
				$tmpSpan.css('fontFamily', $parent.css("fontFamily"))
					.css('fontSize', $parent.css("fontSize"))
					.css('line-height', $parent.css("line-height"))
					.css('letter-spacing', $parent.css("letter-spacing"))
					.css('word-spacing', $parent.css("word-spacing"));

				// Get the position of the temporary span.
				pos = $tmpSpan.position();

				if (typeof pos == 'undefined') return;

				//Revert with original content.
				$parent.html(_original_content_string);

				var beforeEl;
				//Codes will be sorted by the begin position. Maximum begin will be top most.
				//This loop will help to find the evidence before which new evidence to be highlighted so that all the
				//highlighted elements will be accessible for click event.
				if (option.id != 'selection_evidence') {
					$.each($evidenceList.find('code'), function(index, obj) {
						if (option.begin <= $(obj).find('span').data('begin')) {
							beforeEl = obj;
							return false;
						}
					});
				}

				var $code = $("<code></code>")
					.attr('id', option.id)
					.attr('style', 'margin-left:0px; margin-top:' + pos.top + 'px;');

				var $innerSpan = $("<span></span>")
					.addClass("_code_string " + option.name + " " + option.class)
					.data('begin', option.begin)
					.data('documentId', option.documentId)
					.css('fontFamily', $parent.css("fontFamily"))
					.css('fontSize', $parent.css("fontSize"))
					.css('line-height', $parent.css("line-height"))
					.css('letter-spacing', $parent.css("letter-spacing"))
					.css('word-spacing', $parent.css("word-spacing"))
					.html(_searchKey)
					.css('marginLeft', pos.left - parseInt($parent.css('paddingLeft')) - this._calculateLeftPaddingMarginAllParent(_parent) + 'px');

				//Adding Span inside the element and setting css and data attributes.
				$code.append($innerSpan);


				//beforeEl will be the next higher begin position, before which we can add this element.
				if (beforeEl) {
					option.el = $evidenceList.find(beforeEl).before($code);
				} else {
					option.el = $evidenceList.append($code);
				}

				//Events
				//Click Event
				$evidenceList.on('click', '#' + option.id + ' span', function(e) {

					if ($(e.target).parent().attr('id') == 'selection_evidence' && typeof that.config.onSelectionClick === 'function') {
						that.config.onSelectionClick(option, e);
					} else if (typeof option.click === "function") {
						option.click(option, e);
					}
				});

				//return this._highlightMap[that._getHighlightMapIndex(option)];
			}
		};

		this.addEvidencesToDOM = function(docId, callback) {

			this.addToDOM[docId] = true;

			if (this._highlightDocMap[docId]) {
				// Creating Wrapper for Evidence List
				var _parent,
					$parent,
					$grandParent = $('#' + docId),
					that = this;

				// Adding Evidences to DOM if it is not already added.
				if ($grandParent.find('.evidence_list').length == 0) {

					var $evidenceList = this._createEvidenceList($parent);

					$.each(this._highlightDocMap[docId], function(key, option) {

						_parent = _parent || that._getParent(option);
						$parent = $parent || $(_parent);
						that.addEvidenceToDiv(option, _parent, $parent, $evidenceList);

					});

					this._positionEvidenceList($evidenceList, $parent);

					if (!$parent || $parent.length <= 0) {
						return;
					}

					$grandParent.append($evidenceList);
				}
			}

			//Once Evidences are added to DOM execute callback.
			if (typeof callback == 'function')
				callback();
		};

		this.addAllDocEvidenceToDom = function() {

			var that = this;

			//Add all Evidences of all the documents on the DOM.
			$.each(this._highlightDocMap, function(key, obj) {

				that.addEvidencesToDOM(key);

			});
		};

		this.removeEvidence = function(id, source) {
			var object = {};
			object.id = id;
			object.source = source;
			var that = this;
			this._deleteEvidence(object);

			//Removes from DOM, only if similar id doesn't exist in _highlight array.
			var otherInstance = 0;
			var Instance = 0;

			//Temporary Div to get all the classes of the other sources.
			var tmpDiv = $("<div>");

			$.each(this._highlightMap, function(key, obj) {
				if (obj.id == id) {
					otherInstance++;

					//This will add class to temporary div
					tmpDiv.addClass(obj.class)
					tmpDiv.addClass(obj.name)
				}
			});

			if (otherInstance == 0) {
				//To remove the highlight from document panel
				$('#' + id).remove();
				$('.evidence_list').off('click', '#' + object.id + ' span');
			} else {
				//Adding classes to the highlighted evidences.
				$('#' + id + " span").attr('class', tmpDiv.attr('class'));
				$('#' + id + " span").addClass('_code_string');
			}
		};

		this.findEvidence = function(object, callback) {
			var id = object.id || "";
			var source = object.source || "";
			var that = this;


			key = this._getHighlightMapIndex(object);

			var obj = this._highlightMap[key];
			if (typeof obj != 'undefined') {
				callback(obj, key);
			}
		};

		this._getHighlightMapIndex = function(option) {

			return option.id + "_" + option.source;
		};

		this._deleteEvidence = function(object) {

			if (typeof object.documentId == "undefined" && this._highlightMap[this._getHighlightMapIndex(object)]) {
				object = this._highlightMap[this._getHighlightMapIndex(object)];


				//Remove Selection
				if (typeof this._highlightDocMap[object.documentId] != 'undefined') {

					var selectedObj = this._highlightDocMap[object.documentId]['selection_evidence_selection'];
					if (selectedObj && selectedObj.evidence) {
						if (selectedObj && selectedObj.begin == object.begin && selectedObj.documentId == object.documentId && selectedObj.evidence.length == object.evidence.length) {
							delete this._highlightDocMap[object.documentId]['selectin_evidence_selection'];
							delete this._highlightMap['selectin_evidence_selection'];
						}
					}

				}

				delete this._highlightMap[this._getHighlightMapIndex(object)];

				if (typeof this._highlightDocMap[object.documentId] != "undefined")
					delete this._highlightDocMap[object.documentId][this._getHighlightMapIndex(object)];
			}

			/*$('#' + object.id).remove();*/
		}

		this._replaceEvidence = function(object) {

			if (typeof object.documentId == "undefined" && this._highlightMap[this._getHighlightMapIndex(object)]) {
				object = this._highlightMap[this._getHighlightMapIndex(object)];


				//Remove Selection
				if (typeof this._highlightDocMap[object.documentId] != 'undefined') {

					var selectedObj = this._highlightDocMap[object.documentId]['selection_evidence_selection'];
					if (selectedObj && selectedObj.begin == object.begin && selectedObj.documentId == object.documentId && selectedObj.evidence.length == object.evidence.length) {
						delete this._highlightDocMap[object.documentId]['selectin_evidence_selection'];
						delete this._highlightMap['selectin_evidence_selection'];
					}

				}

				//Delete from Highlight Map
				delete this._highlightMap[this._getHighlightMapIndex(object)];

				//Delete from Highlight Document Map
				if (typeof this._highlightDocMap[object.documentId] != "undefined")
					delete this._highlightDocMap[object.documentId][this._getHighlightMapIndex(object)];

				//Replace the calss with new one.
				$('#' + object.id).attr('class', object.class);
			}
		}

		this._createEvidenceList = function($parent) {
			var $evidenceList = $('<div class="evidence_list"></div>');

			if ($parent)
				$evidenceList = this._positionEvidenceList($evidenceList, $parent);

			return $evidenceList;
		};

		this._positionEvidenceList = function($evidenceList, $parent) {

			return $evidenceList.attr('style', 'position: absolute; bottom: 0px; height: 100%; width:' + (parseInt($parent.innerWidth()) - (parseInt($parent.css('paddingLeft')) + parseInt($parent.css('paddingRight')))) + 'px; margin-left:' + $parent.css('paddingLeft') + '; margin-right:' + $parent.css('paddingRight') + ';');
		};

		this._unescape = function(text) {
			return text
				.replace(/&amp;/g, "&")
				.replace(/&lt;/g, "<")
				.replace(/&gt;>/g, ">")
				.replace(/&quot;/g, '"')
				.replace(/&#039;/g, "'");
		}

		this.removeEvidenceFromDocument = function(docId) {
			$('#' + docId).find('.evidence_list').remove();
			that.addToDOM[docId] = false;
		}

		this._calculateLeftPaddingMarginAllParent = function(element) {

			var leftPadding = 0;
			var $preObj;

			$(element).parents().each(function(index, obj) {

				var $obj = $(obj);

				if ($obj.parent().get(0) == document || $obj.parent().css('position') === 'relative') {
					leftPadding += parseFloat($obj.css('paddingLeft')) + parseFloat($obj.css('border-left-width'));
					if ($preObj)
						leftPadding += parseFloat($preObj.offset().left)
					return false;
				} else {
					//leftPadding += parseInt($obj.css('paddingLeft')) + parseInt($obj.css('marginLeft')) + parseInt($obj.css('border-left-width'));
					leftPadding += parseFloat($obj.css('paddingLeft')) + parseFloat($obj.css('border-left-width'));

				}

				$preObj = $obj;
			});
			return leftPadding;
		};

		this._bindEvents = function() {

			//Events to allow selection of overlapping text
			$(this.config.document).on('mousedown', this._setNonePointerEvent);
			$(this.config.document).on('mouseup', this._setAllPointerEvent);
		};

		this._setNonePointerEvent = function() {

			$(this).parent().find('.evidence_list').find('code span').css('pointerEvents', 'none');
		};

		this._setAllPointerEvent = function() {

			$(this).parent().find('.evidence_list').find('code span').css('pointerEvents', 'all');
		};

		this._unbindEvents = function() {

			//Common Event
			//Events to allow selection of overlapping text
			$(this.config.document).off('mousedown', this._setNonePointerEvent);
			$(this.config.document).off('mouseup', this._setAllPointerEvent);
		};

		this._htmlCount = function(string) {

			var tmp = document.createElement("DIV");

			tmp.innerHTML = string;

			var plainText = tmp.textContent || tmp.innerText || "";

			return (string.length - plainText.length);
		};

		this._htmlBegin = function(_content_string, begin, _tmp_key) { //(document String, begin position in string(without html tag), first word of highlighting string)

			var _substring = _content_string.substring(0, begin) || ""; // First part of string before begin index (without HTML)

			var htmlCount = this._htmlCount(_substring); // HTML Tag character count in _substring

			_substring = _content_string.substring(0, begin + htmlCount);

			return (begin + htmlCount + _content_string.substring(begin + htmlCount, begin + htmlCount + 150).indexOf(_tmp_key));
		};

		this.getHightlightCount = function(docId) {
			//return _.size(this._highlightDocMap[docId]);
			return _.Object.keys(this._highlightDocMap[docId]).length;
		};

		this.reRender = function() {
			$('.evidence_list').remove();
			that._unbindEvents();

			if (!this.keepEvidencesHidden) {

				$.each(this.addToDOM, function(docId, val) {
					if (val === true) {
						that.addEvidencesToDOM(docId);
					}
				});

				that._bindEvents();
			}
		};

		this.removeAllEvidences = function() {
			$('.evidence_list').remove();
			that._unbindEvents();
		}

		this.showEvidences = function() {
			this.keepEvidencesHidden = false;
			this.reRender();
		}

		this.hideEvidences = function() {
			this.keepEvidencesHidden = true;
			this.removeAllEvidences();
		}

		this.getNextSource = function(label, id) {
			var objectArray = [];
			var _this = this;

			$.each(that._highlightMap, function(key, object) {
				if (object["evidence"] == label && object["id"] === id) {
					objectArray.push(object);
				}
			});

			if (!id)
				this.lastSource = id;

			if (this.lastSource && this.lastSource.evidence == label && this.lastSource.id === id) {
				$.each(objectArray, function(index, obj) {
					if (_this.lastSource.id === obj.id && index < objectArray.length - 1) {
						if (_this.lastSource.source === obj.source) {
							_this.lastSource = objectArray[index + 1];
							return false;
						}
					} else {
						_this.lastSource = objectArray[0];
						return false;
					}
				});
			} else {
				this.lastSource = objectArray[0];
			}
			return this.lastSource;
		}



		//******************************//
		//Text Selection Related Methods.
		//******************************//


		//Events
		$(this).on('mouseup', function(event) {

			// Get the selected text and its position(begin and end) in document.
			var selectedTXT = that.getSelectionCharOffsetsWithin($(event.target).closest(that.config.document)[0])

			//Remove old selection Highlight.
			if (!$(event.target).hasClass('selection')) {
				that.removeEvidence('selection_evidence', 'selection');
			}

			//Get the id of the parent and that is considered as documentId.
			var documentId = $(event.target).closest(that.config.document).parent().attr('id') || "";

			//IF highlightSelection is defined as true and selection is proper, highlight new selection.
			if (that.config.highlightSelection && typeof selectedTXT !== 'undefined' && selectedTXT.string && selectedTXT.string.length > 0) {
				that.addEvidence({
					evidence: selectedTXT.string,
					begin: selectedTXT.start,
					end: selectedTXT.end,
					name: 'selection',
					id: 'selection_evidence',
					documentId: documentId,
					class: 'yellow',
					source: "selection",
				});
			}

			//After selection execute Mouseup event.
			if (config.mouseup) {
				config.mouseup(selectedTXT, event);
			}

		});

		$(this).on('mousedown', function(event) {

			///MouseDown Event on Text Selection start.
			if (config.mousedown) {
				config.mousedown(event);
			}

		});



		this._rTrim = function(string) {

			return string.replace(/\s+$/, '');
		}

		this.getSelected = function() {

			var sel = '';
			if (document.selection) {
				sel = document.selection.createRange();
			} else if (document.getSelection) {
				sel = document.getSelection();
			} else if (window.find('').getSelection) {
				sel = window.getSelection();
			}
			return sel;
		}

		this.getSelectionCharOffsetsWithin = function(element) {
			var start = 0,
				end = 0;
			var string, sel, range, priorRange,
				leftMostSpaces = 0;

			if ($.isArray(element) && element.length > 0) {
				element = element[0];
			}

			if (this.getSelected() !== "") {
				if (typeof window.getSelection != "undefined") {
					//                    string = this._rTrim(window.getSelection().toString()).trim();
					string = this._rTrim(window.getSelection().toString());
					leftMostSpaces = string.indexOf(string.trim().split(" ")[0]);
					string = string.trim();

					if (string && string.length > 0) {

						range = window.getSelection().getRangeAt(0);
						priorRange = range.cloneRange();
						priorRange.selectNodeContents(element);
						priorRange.setEnd(range.startContainer, range.startOffset);
						start = priorRange.toString().length //+ this.preHTMLCount(priorRange);
						end = start + range.toString().length;
						window.getSelection().removeAllRanges();

					}

				} else if (typeof document.selection != "undefined" && (sel = document.selection).type != "Control") {
					string = this._rTrim(sel.createRange().text);
					leftMostSpaces = string.indexOf(string.trim().split(" ")[0]);
					string = string.trim();

					if (string && string.length > 0) {

						range = sel.createRange();
						priorRange = document.body.createTextRange();
						priorRange.moveToElementText(element[0]);
						priorRange.setEndPoint("EndToStart", range);
						start = priorRange.text.length //+ this.preHTMLCount(priorRange);
						end = start + range.text.length;
						document.selection.empty();

					}

				}

				var _startOffset, _endOffset;
				var _previousChar, _currentChar, _lastChar, _nextChar;

				if (range && range.commonAncestorContainer.data) {

					_startOffset = range.startOffset;

					_endOffset = range.endOffset;

					_currentChar = range.commonAncestorContainer.data.substring(_startOffset, _startOffset + 1);
					//console.log(_currentChar);

					_previousChar = range.commonAncestorContainer.data.substring(_startOffset - 1, _startOffset);
					//console.log(_previousChar);

					_lastChar = range.commonAncestorContainer.data.substring(_endOffset - 1, _endOffset);
					//console.log(_lastChar);

					_nextChar = range.commonAncestorContainer.data.substring(_endOffset, _endOffset + 1);
					//console.log(_nextChar);

					var startPoint = 0,
						endPoint = 0;

					//Following code selects the word from starting when it is not selected from the starting.
					if (_currentChar != " ") {
						while (_previousChar != " " && _previousChar.match("[a-zA-Z0-9]") != null) {
							start = start - 1;
							startPoint = startPoint + 1;
							_previousChar = range.commonAncestorContainer.data.substring(range.startOffset - (startPoint - 1), range.startOffset - (startPoint));
							string = _previousChar + string;
						}
					}

					//Following code selects the word till end when it is not selected properly.
					if (_lastChar != " ") {
						while (_nextChar != " " && _nextChar.match("[a-zA-Z0-9]") != null) {
							end = end + 1;
							endPoint = endPoint + 1;
							string = string + _nextChar;
							_nextChar = range.commonAncestorContainer.data.substring(range.endOffset + endPoint, range.endOffset + (endPoint + 1));
						}
					}

				}

				if (string && string.length > 0 && !this.is_html(string) && (_previousChar.match("[a-zA-Z0-9]") == null || _currentChar == " ")) {
					//Selection will be returned only if following scenarios are satisfied.
					//1. Selected String is greater than 0 character
					//2. Selected String is not having any HTML Tag.
					return {
						string: string,
						start: start + leftMostSpaces,
						end: end
					};
				} else {
					return false;
				}

			}
			return false;
		}

		this.is_html = function(string) {

			return /\n/.test(string) || /\t/.test(string);
		}

		this.preHTMLCount = function(priorRange) {

			var abc = priorRange.cloneContents();
			var htmlLength = 0;
			if (typeof abc.children === 'undefined')
				abc.children = abc.childNodes;
			$.each(abc.children, function(index, el) {
				if (typeof $(el)[0].outerHTML !== 'undefined')
					htmlLength += parseInt($(el)[0].outerHTML.length);
				else {
					htmlLength += 0;
				}
			});
			return htmlLength;
		}

		this.generateRandomID = function() {

			return Date.now();;
		}

		this._bindEvents();

		return this;
	}

}));