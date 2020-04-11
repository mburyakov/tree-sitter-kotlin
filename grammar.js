/*
 * MIT License
 * 
 * Copyright (c) 2019 fwcd
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

// Using an adapted version of https://kotlinlang.org/docs/reference/grammar.html

const PREC = {
	// 'dynamic?' means dynamic type
	// 'import' 'x' -- not infix call but import statement
	// 'internal' 'open' 'class' -- not infix call but class declaration
	SIMPLE_IDENTIDIER: -2,
	TYPE_REFERENCE: -1,

	// lambda literal without parameters look same as block, block is preferred when both suitable (inside 'do { } while (true) ')
	BLOCK: 0,
	LAMBDA_LITERAL: -1,

	// label for expression statement is on the statement instead of expression
	// annotation for value argument is on the argument instead of expression
	VALUE_ARGUMENT: 1,
	STATEMENT_LABEL: 1,
	UNARY_PREFIX: 0,
};

module.exports = grammar({
	name: "kotlin",
	
	conflicts: $ => [
		// Ambiguous when used in an explicit delegation expression,
		// since the '{' could either be interpreted as the class body
		// or as the anonymous function body. Consider the following sequence:
		//
		// 'class'  simple_identifier  ':'  user_type  'by'  'fun'  '('  ')'  •  '{'  …
		//
		// Possible interpretations:
		//
		// 'class'  simple_identifier  ':'  user_type  'by'  (anonymous_function  'fun'  '('  ')'  •  function_body)
		// 'class'  simple_identifier  ':'  user_type  'by'  (anonymous_function  'fun'  '('  ')')  •  '{'  …
		//[$.anonymous_function],

		// Member access operator '::' conflicts with callable reference
		//[$.primaryExpression, $.simpleUserType, $.valueArgument],
		[$.primaryExpression, $.simpleUserType, $.parameter],
		[$.primaryExpression, $.simpleUserType],

		[$.primaryExpression, $.simpleUserType, $.parameter, $.directlyAssignableExpression],
		// '(Type)::something()' starts similar with '(x) + 1'
		[$.primaryExpression, $.simpleUserType, $.directlyAssignableExpression],

		// type arguments conflict with comparison operator
		[$.postfixUnaryExpression],

		[$.typeReference, $.userType],

        // getter can be confused with subsequent declaration:
		// val x = 5 • public get
		[$.property_declaration],

		// to recognize such as 'label@x++'
		[$.label, $.primaryExpression],

		// to distinguish expression/assignableExpression/directlyAssignableExpression
		[$.prefixUnaryExpression, $.directlyAssignableExpression],
		[$.asExpression, $.assignableExpression],

		// for such anonymous functions as 'fun (Int).():Int'
		[$.parameter_modifiers, $.typeModifier],
		[$.simpleUserType, $.parameterWithOptionalType],

		// '(@Annotation T)?::field
		[$.unaryPrefix, $.typeModifier],
	],

	extras: $ => [$.WS, $.Hidden],
	word: $ => $.Identifier,

	rules: {
		// ====================
		// Syntax grammar
		// ====================

		// ==========
		// General
		// ==========

		// start

		//start: $ => $._statement,

		source_file: $ => seq(
			optional($.shebang_line),
			optional($.NLS),
			optional(seq(repeat1($.file_annotation))),
			optional($.package_header),
			repeat($.import_header),
			repeat(seq($._statement, $._semis)),
			optional($._statement)
		),

		shebang_line: $ => seq("#!", /[^\r\n]*/),

		file_annotation: $ => seq(
			choice(
				$.AT_NO_WS,
				$.AT_PRE_WS,
			),
			$.FILE,
			optional($.NLS),
			$.COLON,
			optional($.NLS),
			choice(
				seq($.LSQUARE, repeat1($._unescaped_annotation), $.RSQUARE),
				$._unescaped_annotation
			),
			optional($.NLS),
		),

		package_header: $ => seq("package", $.identifier, $._semi),

		import_header: $ => seq(
			$.IMPORT,
			$.identifier,
			optional(choice(seq(".*"), $.import_alias)),
			$._semi
		),

		import_alias: $ => seq("as", alias($.simple_identifier, $.type_identifier)),

		top_level_object: $ => seq($._declaration, optional($._semis)),

		type_alias: $ => seq(
			optional($.modifiers),
			"typealias",
			alias($.simple_identifier, $.type_identifier),
			optional($.type_parameters),
			"=",
			$._type
		),

		_declaration: $ => choice(
			$.class_declaration,
			$.object_declaration,
			$.function_declaration,
			$.property_declaration,
			$.type_alias
		),

		// ==========
		// Classes
		// ==========

		class_declaration: $ => prec.right(choice(
			seq(
				optional($.modifiers),
				choice($.CLASS, "interface"),
				alias($.simple_identifier, $.type_identifier),
				optional($.type_parameters),
				optional($.primary_constructor),
				optional(seq($.COLON, $._delegation_specifiers)),
				optional($.type_constraints),
				optional($.class_body)
			),
			seq(
				optional($.modifiers),
				$.ENUM,
				$.CLASS,
				alias($.simple_identifier, $.type_identifier),
				optional($.type_parameters),
				optional($.primary_constructor),
				optional(seq(":", $._delegation_specifiers)),
				optional($.type_constraints),
				optional($.enum_class_body)
			)
		)),

		primary_constructor: $ => seq(
			optional(seq(optional($.modifiers), "constructor")),
			$._class_parameters
		),

		class_body: $ => seq(
			"{",
			optional($.NLS),
			optional($._class_member_declarations),
			"}"
		),

		_class_parameters: $ => seq(
			"(",
			optional($.NLS),
			optional(sep1(
				seq($.class_parameter, optional($.NLS)),
				seq(",", optional($.NLS))
			)),
			")"
		),

		class_parameter: $ => seq(
			optional($.modifiers),
			optional(choice("val", "var")),
			$.simple_identifier,
			":",
			$._type,
			optional(seq("=", $._expression))
		),

		_delegation_specifiers: $ => prec.left(sep1(
			$.delegation_specifier,
			// $._annotated_delegation_specifier, // TODO: Annotations cause ambiguities with type modifiers
			","
		)),

		delegation_specifier: $ => prec.left(choice(
			$.constructor_invocation,
			$.explicit_delegation,
			prec(2, $.userType),
			$.function_type
		)),

		_annotated_delegation_specifier: $ => seq(repeat($.annotation), $.delegation_specifier),

		explicit_delegation: $ => seq(
			choice(
				$.user_type,
				$.function_type
			),
			"by",
			$._expression
		),

		type_parameters: $ => seq($.LANGLE, sep1($.type_parameter, ","), $.RANGLE),

		type_parameter: $ => seq(
			optional($.type_parameter_modifiers),
			alias($.simple_identifier, $.type_identifier),
			optional(seq(":", $._type))
		),

		type_constraints: $ => prec.right(seq("where", sep1($.type_constraint, ","))),

		type_constraint: $ => seq(
			repeat($.annotation),
			alias($.simple_identifier, $.type_identifier),
			":",
			$._type
		),

		// ==========
		// Class members
		// ==========

		_class_member_declarations: $ => repeat1(seq($._class_member_declaration, $._semis)),

		_class_member_declaration: $ => choice(
			$._declaration,
			$.companion_object,
			$.anonymous_initializer,
			$.secondary_constructor
		),

		anonymous_initializer: $ => seq("init", $.block),

		companion_object: $ => seq(
			optional($.modifiers),
			"companion",
			"object",
			optional(alias($.simple_identifier, $.type_identifier)),
			optional(seq(":", $._delegation_specifiers)),
			optional($.class_body)
		),

		_function_value_parameters: $ => seq("(", optional(sep1($._function_value_parameter, ",")), ")"),

		_function_value_parameter: $ => seq(
			optional($.parameter_modifiers),
			$.parameter,
			optional(seq("=", $._expression))
		),

		function_declaration: $ => seq(
			optional($.modifiers),
			"fun",
			optional(seq(
				optional($.NLS),
				$.type_parameters
			)),
			optional(seq(
				optional($.NLS),
				$.receiverTypeWithDot,
			)),
			$.simple_identifier,
			optional($.NLS),
			$._function_value_parameters,
			optional(seq(
				//optional($.NLS),
				$.COLON,
				optional($.NLS),
				$._type,
			)),
			optional(seq(
				//optional($.NLS),
				$.type_constraints,
			)),
			optional(seq(
				//optional($.NLS),
				$.function_body,
			)),
		),

		function_body: $ => choice(
			$.block,
			seq(
				"=",
				optional($.NLS),
				$._expression
			)
		),

		variable_declaration: $ => seq(
			// repeat($.annotation), TODO
			$.simple_identifier,
			optional(seq(":", $._type))
		),

		property_declaration: $ => seq(
			optional($.modifiers),
			choice("val", "var"),
			optional(seq(
				optional($.NLS),
				$.type_parameters
			)),
			optional(seq(
				optional($.NLS),
				$.receiverTypeWithDot,
			)),
			$.variable_declaration, // TODO: Multi-variable-declaration
			optional($.type_constraints),
			optional(choice(
				seq("=", $._expression),
				$.property_delegate
			)),
			choice(
				seq(
					optional(seq(
						//$.NLS,
						$.semi,
					)),
					optional($.getter),
					optional(seq(
						//optional($.NLS),
						optional($.semi),
						$.setter,
					)),
				),
				seq(
					optional(seq(
						//$.NLS,
						$.semi,
					)),
					optional($.setter),
					optional(seq(
						//optional($.NLS),
						optional($.semi),
						$.getter,
					)),
				),
			)
		),

		property_delegate: $ => seq("by", $._expression),

		getter: $ => seq(
			optional($.modifiers),
			"get",
			optional(seq(
				//optional($.NLS),
				"(",
				optional($.NLS),
				")",
				optional(seq(
					optional($.NLS),
					":",
					optional($.NLS),
					$.type
				)),
				optional($.NLS),
				$.function_body
			))
		),

		setter: $ => seq(
			optional($.modifiers),
			"set",
			optional(seq(
				//optional($.NLS),
				"(",
				optional($.NLS),
				$.parameterWithOptionalType,
				optional($.NLS),
				")",
				optional(seq(
					optional($.NLS),
					":",
					optional($.NLS),
					$._type
				)),
				optional($.NLS),
				$.function_body
			))
		),

		parametersWithOptionalType: $ => seq(
			$.LPAREN,
			optional(seq(
				optional($.NLS),
				$.parameterWithOptionalType,
				repeat(seq(
					optional($.NLS),
					$.COMMA,
					optional($.NLS),
					$.parameterWithOptionalType,
				)),
			)),
			optional($.NLS),
			$.RPAREN,
		),

		parameterWithOptionalType: $ => seq(
			optional($.parameter_modifiers),
			$.simpleIdentifier,
			optional(seq(
				//optional($.NLS),
				$.COLON,
				optional($.NLS),
				$._type
			))
		),

		object_declaration: $ => prec.right(seq(
			optional($.modifiers),
			"object",
			alias($.simple_identifier, $.type_identifier),
			optional(seq(":", $._delegation_specifiers)),
			optional($.class_body)
		)),

		secondary_constructor: $ => seq(
			optional($.modifiers),
			"constructor",
			$._function_value_parameters,
			optional(seq(":", $.constructor_delegation_call)),
			optional($.block)
		),

		constructor_delegation_call: $ => seq(choice("this", "super"), $.value_arguments),

		// ==========
		// Enum classes
		// ==========

		enum_class_body: $ => seq(
			"{",
			optional($.NLS),
			optional($._enum_entries),
			optional(seq(
				";",
				optional($.NLS),
				optional($._class_member_declarations),
			)),
			"}"
		),

		_enum_entries: $ => seq(sep1(seq($.enum_entry, optional($.NLS)), seq(",", optional($.NLS))), optional(","), optional($.NLS)),

		enum_entry: $ => seq(
			optional($.modifiers),
			$.simple_identifier,
			optional($.value_arguments),
			optional($.class_body)
		),

		// ==========
		// Statements
		// ==========

		statements: $ => seq(
			$._statement,
			repeat(seq($._semis, $._statement)),
			optional($._semis),
		),

		_statement: $ => choice(
			seq(
				repeat(prec(PREC.STATEMENT_LABEL, choice($.label, $.annotation))),
				choice(
					$._declaration,
					$.assignment,
					$._loop_statement,
					$._expression
				)
			)
		),

		control_structure_body: $ => choice($.block, $._statement),

		block: $ => prec(PREC.BLOCK, seq(
			"{",
			optional(choice(
				seq(optional($.NLS), $.statements),
				$.semis
			)),
			"}",
		)),

		_loop_statement: $ => choice(
			$.for_statement,
			$.while_statement,
			$.do_while_statement
		),

		for_statement: $ => prec.right(seq(
			"for",
			"(",
			repeat($.annotation),
			choice($.variable_declaration), // TODO: Multi-variable declaration
			"in",
			$._expression,
			")",
			optional($.control_structure_body)
		)),

		while_statement: $ => seq(
			"while",
			"(",
			$._expression,
			")",
			choice(";", $.control_structure_body)
		),

		do_while_statement: $ => prec.right(seq(
			"do",
			optional($.control_structure_body),
			"while",
			"(",
			$._expression,
			")",
		)),

		assignment: $ => choice(
			seq(
				$.directlyAssignableExpression,
				$.ASSIGNMENT,
				optional($.NLS),
				$.expression,
			),
			seq(
				$.assignableExpression,
				$._assignment_and_operator,
				optional($.NLS),
				$.expression
			),
		),

		annotated_lambda: $ => seq(
			repeat($.annotation),
			optional($.label),
			$.lambda_literal
		),

		lambda_literal: $ => prec(PREC.LAMBDA_LITERAL, seq(
			"{",
			optional(seq(
				optional($.NLS),
				optional($.lambda_parameters),
				"->",
			)),
			optional(seq(
				optional($.NLS),
				$.statements,
			)),
			"}",
		)),

		lambda_parameters: $ => sep1($._lambda_parameter, ","),

		_lambda_parameter: $ => choice(
			$.variable_declaration, // TODO
		),

		anonymous_function: $ => seq(
			"fun",
			optional(seq(
				optional($.NLS),
				$.receiverTypeWithDot,
			)),
			$.parametersWithOptionalType,
			optional(seq(
				//optional($.NLS),
				$.COLON,
				optional($.NLS),
				$._type,
			)),
			// Do really type constraints and empty body make sense?
			// optional(seq(
			// 	optional($.NLS),
			// 	$.type_constraints,
			// )),
			// optional(seq(
			// 	//optional($.NLS),
			// 	$.function_body,
			// )),
			$.function_body
		),

		_function_literal: $ => choice(
			$.lambda_literal,
			$.anonymous_function
		),

		object_literal: $ => seq(
			"object",
			optional(seq(":", $._delegation_specifiers)),
			$.class_body
		),

		if_expression: $ => prec.right(seq(
			"if",
			"(", $._expression, ")",
			choice(
				$.control_structure_body,
				";",
				seq(
					optional($.control_structure_body),
					optional(";"),
					"else",
					choice($.control_structure_body, ";")
				)
			)
		)),

		when_subject: $ => seq(
			"(",
			optional(seq(
				repeat($.annotation),
				"val",
				$.variable_declaration,
				"="
			)),
			$._expression,
			")",
		),

		when_expression: $ => seq(
			"when",
			optional($.when_subject),
			"{",
			repeat($.when_entry),
			"}"
		),

		when_entry: $ => seq(
			choice(
				seq($.when_condition, repeat(seq(",", $.when_condition))),
				"else"
			),
			"->",
			$.control_structure_body,
			optional($._semi)
		),

		when_condition: $ => seq(
			$._expression,
			$.range_test,
			$.type_test
		),

		range_test: $ => seq($._in_operator, $._expression),

		type_test: $ => seq($._is_operator, $._expression),

		try_expression: $ => seq(
			"try",
			$.block,
			choice(
				seq(repeat1($.catch_block), optional($.finally_block)),
				$.finally_block
			)
		),

		catch_block: $ => seq(
			"catch",
			"(",
			repeat($.annotation),
			$.simple_identifier,
			":",
			$._type,
			")",
			$.block,
		),

		finally_block: $ => seq("finally", $.block),

		_assignment_and_operator: $ => choice("+=", "-=", "*=", "/=", "%="),
		
		_in_operator: $ => $.inOperator,
		
		_is_operator: $ => $.isOperator,

		// ==========
		// Modifiers
		// ==========

		modifiers: $ => prec.right(repeat1(choice($.annotation, $._modifier))),

		parameter_modifiers: $ => prec.right(choice($.annotation, repeat1($.parameter_modifier))),

		_modifier: $ => choice(
			$.class_modifier,
			$.member_modifier,
			$.visibility_modifier,
			$.function_modifier,
			$.property_modifier,
			$.inheritance_modifier,
			$.parameter_modifier,
			$.platform_modifier
		),

		type_modifiers: $ => prec.right(repeat1($._type_modifier)),

		_type_modifier: $ => choice($.annotation, $.SUSPEND),

		class_modifier: $ => choice(
			$.SEALED,
			$.ANNOTATION,
			$.DATA,
			$.INNER
		),

		member_modifier: $ => choice(
			$.OVERRIDE,
			$.LATEINIT
		),

		visibility_modifier: $ => choice(
			$.PUBLIC,
			$.PRIVATE,
			$.INTERNAL,
			$.PROTECTED
		),

		type_parameter_modifiers: $ => prec.right(repeat1($._type_parameter_modifier)),

		_type_parameter_modifier: $ => choice(
			$.reification_modifier,
			$.varianceModifier,
			$.annotation
		),

		function_modifier: $ => choice(
			$.TAILREC,
			$.OPERATOR,
			$.INFIX,
			$.INLINE,
			$.SUSPEND,
			$.SUSPEND
		),

		property_modifier: $ => $.CONST,

		inheritance_modifier: $ => choice(
			$.ABSTRACT,
			$.FINAL,
			$.OPEN
		),

		parameter_modifier: $ => choice(
			$.VARARG,
			$.NOINLINE,
			$.CROSSINLINE
		),

		reification_modifier: $ => "reified",

		platform_modifier: $ => choice(
			$.EXPECT,
			$.ACTUAL
		),

		// ==========
		// Identifiers
		// ==========

		identifier: $ => sep1($.simple_identifier, "."),

		// ==========
		// Glue for expression part converted from antlr
		// ==========

		_expression: $ => $.expression,
		constructor_invocation: $ => $.constructorInvocation,
		value_arguments: $ => $.valueArguments,
		_unescaped_annotation: $ => $.unescapedAnnotation,
		simple_identifier: $ => $.simpleIdentifier,
		_type: $ => $.type,
		user_type: $ => $.userType,
		function_type: $ => $.functionType,
		_simple_user_type: $ => $.simpleUserType,
		_semi: $ => $.semi,
		_semis: $ => $.semis,
		semi: $ => prec.right(choice(seq(";", optional($.NLS)), $.NLS)),
		semis: $ => choice(
			seq(
				repeat($.NLS),
				repeat1(seq(";", repeat($.NLS))),
			),
			repeat1($.NLS)
		),
		//_semis: $ => seq(optional($.NLS), repeat(seq(";", optional($.NLS)))),
		//parameter: $ => "parameter",





		//=================converted from antlr (expressions with some restrictions)==========================





		constructorInvocation: $ => prec(1, seq(
			$.userType,
			$.valueArguments
		)),

		parameter: $ => seq(
			$.simpleIdentifier,
			optional($.NLS),
			$.COLON,
			optional($.NLS),
			$.type
		),

		type: $ => seq(
			optional($.typeModifiers),
			choice(
				$.parenthesizedType,
				$.nullableType,
				$.typeReference,
				$.functionType
			)
		),

		typeReference: $ => choice(
			$.userType,
			$.DYNAMIC
		),

		nullableType: $ => prec.right(seq(
			choice(
				$.typeReference,
				$.parenthesizedType
			),
			//optional($.NLS),
			repeat1($.quest)
		)),

		quest: $ => $.NLSQUEST,

		userType: $ => seq(
			optional(seq(
				$.userType,
				alias($.NLSDOT, $.DOT),
				optional($.NLS)
			)),
			$.simpleUserType,
		),

		simpleUserType: $ => prec.right(seq(
			alias($.simpleIdentifier, $.type_identifier),
			optional(seq(
				//optional($.NLS),
				$.typeArguments
			))
		)),

		typeProjection: $ => choice(
			seq(
				optional($.typeProjectionModifiers),
				$.type
			),
			$.MULT
		),

		typeProjectionModifiers: $ => prec.right(repeat1($.typeProjectionModifier)),

		typeProjectionModifier: $ => prec(1, choice(
			seq(
				$.varianceModifier,
				optional($.NLS),
			),
			$.annotation
		)),

		functionType: $ => seq(
			optional(seq(
				$.receiverTypeWithDot,
			)),
			$.functionTypeParameters,
			optional($.NLS),
			$.ARROW,
			optional($.NLS),
			$.type
		),

		functionTypeParameters: $ => seq(
			$.LPAREN,
			optional(seq(optional($.NLS), choice(
				$.parameter,
				$.type
			))),
			repeat(seq(
				optional($.NLS),
				$.COMMA,
				optional($.NLS),
				choice(
					$.parameter,
					$.type
				)
			)),
			optional($.NLS),
			$.RPAREN
		),

		parenthesizedType: $ => prec(1, seq(
			$.LPAREN,
			optional($.NLS),
			$.type,
			optional($.NLS),
			$.RPAREN
		)),

		receiverType: $ => seq(
			choice(
				$.parenthesizedType,
				$.nullableType,
				$.typeReference
			)
		),

		receiverTypeWithDot: $ => choice(
			seq(
				$.receiverType,
				alias($.NLSDOT, $.DOT),
				optional($.NLS),
			)
		),

		label: $ => prec.right(seq(
			$.simpleIdentifier,
			choice(
				$.AT_NO_WS,
				$.AT_POST_WS
			),
			optional($.NLS)
		)),

		expression: $ => $.disjunction,

		disjunction: $ => seq(
			$.conjunction,
			repeat(seq(
				//optional($.NLS),
				$.DISJ,
				optional($.NLS),
				$.conjunction,
				optional($.NLS)
			))
		),

		conjunction: $ => seq(
			$.equality,
			repeat(seq(
				//optional($.NLS),
				$.CONJ,
				optional($.NLS),
				$.equality,
		        optional($.NLS)
			))
		),

		equality: $ => seq(
			$.comparison,
			repeat(seq(
				$.equalityOperator,
				optional($.NLS),
				$.comparison
			))
		),

		comparison: $ => seq(
			$.infixOperation,
			optional(seq(
				$.comparisonOperator,
				optional($.NLS),
				$.infixOperation
			))
		),

		infixOperation: $ => seq(
			$.elvisExpression,
			repeat(choice(
				seq(
					$.inOperator,
					optional($.NLS),
					$.elvisExpression
				),
				seq(
					$.isOperator,
					optional($.NLS),
					$.type
				)
			))
		),

		elvisExpression: $ => seq(
			$.infixFunctionCall,
			repeat(seq(
				//optional($.NLS),
				$.elvis,
				optional($.NLS),
				$.infixFunctionCall,
		        optional($.NLS)
			))
		),

		elvis: $ => "?:",
		nullableCallable: $ => "?::",

		infixFunctionCall: $ => prec.right(seq(
			$.rangeExpression,
			repeat(seq(
				$.simpleIdentifier,
				optional($.NLS),
				$.rangeExpression
			))
		)),

		rangeExpression: $ => seq(
			$.additiveExpression,
			repeat(seq(
				$.RANGE,
				optional($.NLS),
				$.additiveExpression
			))
		),

		additiveExpression: $ => seq(
			$.multiplicativeExpression,
			repeat(seq(
				$.additiveOperator,
				optional($.NLS),
				$.multiplicativeExpression
			))
		),

		multiplicativeExpression: $ => seq(
			$.asExpression,
			repeat(seq(
				$.multiplicativeOperator,
				optional($.NLS),
				$.asExpression
			))
		),

		asExpression: $ => seq(
			$.prefixUnaryExpression,
			optional(seq(
				//optional($.NLS),
				$.asOperator,
				optional($.NLS),
				$.type
			))
		),

		prefixUnaryExpression: $ => seq(
			repeat($.unaryPrefix),
			$.postfixUnaryExpression
		),

		unaryPrefix: $ => prec(PREC.UNARY_PREFIX, choice(
			$.annotation,
			$.label,
			seq(
				$.prefixUnaryOperator,
				optional($.NLS)
			)
		)),

		postfixUnaryExpression: $ => seq(
			$.primaryExpression,
			repeat(seq(
				$.postfixUnarySuffix,
			))
		),

		postfixUnarySuffix: $ => choice(
			$.postfixUnaryOperator,
			//$.typeArguments,
			$.callSuffix,
			$.indexingSuffix,
			$.navigationSuffix,
		),

		directlyAssignableExpression: $ => choice(
			seq(
				$.postfixUnaryExpression,
				$.assignableSuffix,
			),
			$.simpleIdentifier,
			$.parenthesizedDirectlyAssignableExpression,
		),

		parenthesizedDirectlyAssignableExpression: $ => seq(
			$.LPAREN,
			optional($.NLS),
			$.directlyAssignableExpression,
			optional($.NLS),
			$.RPAREN,
		),

		assignableExpression: $ => choice(
			$.prefixUnaryExpression,
			$.parenthesizedAssignableExpression,
		),

		parenthesizedAssignableExpression: $ => seq(
			$.LPAREN,
			optional($.NLS),
			$.assignableExpression,
			optional($.NLS),
			$.RPAREN,
		),

		assignableSuffix: $ => choice(
			$.typeArguments,
			$.indexingSuffix,
			$.navigationSuffix,
		),

		indexingSuffix: $ => seq(
			$.LSQUARE,
			optional($.NLS),
			$.expression,
			repeat(seq(
				optional($.NLS),
				$.COMMA,
				optional($.NLS),
				$.expression
			)),
			optional($.NLS),
			$.RSQUARE
		),

		navigationSuffix: $ => seq(
			//optional($.NLS),
			$.memberAccessOperator,
			optional($.NLS),
			choice(
				$.simpleIdentifier,
				$.parenthesizedExpression,
				$.CLASS
			)
		),

		callSuffix: $ => prec.right(choice(
			seq(
				optional($.typeArguments),
				optional($.valueArguments),
				$.annotated_lambda,
			),
			seq(
				optional($.typeArguments),
				$.valueArguments
			)
		)),

		typeArguments: $ => seq(
			$.LANGLE,
			optional($.NLS),
			$.typeProjection,
			repeat(seq(
				optional($.NLS),
				$.COMMA,
				optional($.NLS),
				$.typeProjection
			)),
			optional($.NLS),
			$.RANGLE
		),

		valueArguments: $ => choice(
			seq(
				$.LPAREN,
				optional($.NLS),
				$.RPAREN
			),
			seq(
				$.LPAREN,
				optional($.NLS),
				$.valueArgument,
				repeat(seq(
					optional($.NLS),
					$.COMMA,
					optional($.NLS),
					$.valueArgument
				)),
				optional($.NLS),
				$.RPAREN
			)
		),

		valueArgument: $ => prec(PREC.VALUE_ARGUMENT, seq(
			optional(seq($.annotation, optional($.NLS))),
			optional(seq(
				$.simpleIdentifier,
				//optional($.NLS),
				$.ASSIGNMENT,
				optional($.NLS)
			)),
			optional(seq($.MULT, optional($.NLS))),
			$.expression
		)),

		primaryExpression: $ => choice(
			$.parenthesizedExpression,
			$.simpleIdentifier,
			$.literalConstant,
			$.stringLiteral,
			$.callableReference,
			//$._function_literal,
			//$.object_literal,
			$.collectionLiteral,
			$.thisExpression,
			$.superExpression,
			//$.if_expression,
			//$.when_expression,
			//$.try_expression,
			// jumpExpression was moved to the top, see expression rule
		),

		parenthesizedExpression: $ => seq(
			$.LPAREN,
			optional($.NLS),
			$.expression,
			optional($.NLS),
			$.RPAREN
		),

		collectionLiteral: $ => choice(
			seq(
				$.LSQUARE,
				optional($.NLS),
				$.expression,
				repeat(seq(
					optional($.NLS),
					$.COMMA,
					optional($.NLS),
					$.expression
				)),
				optional($.NLS),
				$.RSQUARE
			),
			seq(
				$.LSQUARE,
				optional($.NLS),
				$.RSQUARE
			)
		),

		literalConstant: $ => choice(
			$.BooleanLiteral,
			$.IntegerLiteral,
			$.HexLiteral,
			$.BinLiteral,
			$.CharacterLiteral,
			$.RealLiteral,
			$.NullLiteral,
			$.LongLiteral,
			$.UnsignedLiteral
		),

		stringLiteral: $ => choice(
			$.lineStringLiteral,
			$.multiLineStringLiteral,
			// for not to break all following lines when closing quote is missing
			$.unfinishedLineStringLiteral,
		),

		lineStringLiteral: $ => seq(
			"\"",
			repeat(choice(
				$.lineStringContent,
				$.lineStringExpression,
			)),
			"\"",
		),

		unfinishedLineStringLiteral: $ => seq(
			"\"",
			repeat(choice(
				$.lineStringContent,
				$.lineStringExpression,
			)),
			$.NLS,
		),

		multiLineStringLiteral: $ => seq(
			$.TRIPLE_QUOTE_OPEN,
			repeat(choice(
				$.multiLineStringContent,
				$.multiLineStringExpression,
			)),
			$.TRIPLE_QUOTE_CLOSE,
		),

		lineStringContent: $ => choice(
			$.LineStrText,
			$.LineStrEscapedChar,
			$.LineStrRef,
		),

		lineStringExpression: $ => seq(
			"${",
			$.expression,
			"}",
		),

		multiLineStringContent: $ => choice(
			$.MultiLineStrText,
			$.MultiLineStrQuote,
			$.MultiLineStrRef,
		),

		multiLineStringExpression: $ => seq(
			"${",
			optional($.NLS),
			$.expression,
			optional($.NLS),
			"}",
		),

		LineStrText: $ => /[^\\"$]+|\$/,
		MultiLineStrText: $ => /[^"$]+|\$/,
		LineStrEscapedChar: $ => choice(
			$.EscapedIdentifier,
			$.UniCharacterLiteral,
		),
		LineStrRef: $ => $.FieldIdentifier,
		MultiLineStrQuote: $ => /"?"/,
		MultiLineStrRef: $ => $.FieldIdentifier,
		EscapedIdentifier: $ => /\\[tbrn'"\\$]/,
		UniCharacterLiteral: $ => /\\u[0-9a-fA-F]{4}/,
		FieldIdentifier: $ => token(seq("$", choice(
			seq(
				choice(
					/[a-zA-Z]/,
					"_"
				),
				repeat(choice(
					/[a-zA-Z]/,
					"_",
					/[0-9]/
				))
			),
			seq(
				"`",
				repeat1(/[^\r\n`]/),
				"`"
			)
		))),
		TRIPLE_QUOTE_OPEN: $ => /"""/,
		TRIPLE_QUOTE_CLOSE: $ => /"*"""/,

		thisExpression: $ => choice(
			$.THIS,
			$.THIS_AT
		),

		superExpression: $ => prec.left(choice(
			seq(
				$.SUPER,
				optional(seq(
					$.LANGLE,
					optional($.NLS),
					$.type,
					optional($.NLS),
					$.RANGLE
				)),
				optional(seq(
					$.AT_NO_WS,
					$.simpleIdentifier
				))
			),
			$.SUPER_AT
		)),

		jumpExpression: $ => choice(
			seq(
				$.THROW,
				optional($.NLS),
				$.expression,
			),
			seq(
				choice(
					$.RETURN,
					$.RETURN_AT,
				),
				optional($.expression),
			),
			$.CONTINUE,
			$.CONTINUE_AT,
			$.BREAK,
			$.BREAK_AT,
		),

		callableReference: $ => seq(
			choice(
				seq(
					optional($.receiverType),
					//optional($.NLS)
					$.COLONCOLON,
				),
				seq(
					$.parenthesizedType,
					$.nullableCallable,
				),
				seq(
					$.typeReference,
					$.nullableCallable,
				),
			),
			optional($.NLS),
			choice(
				$.simpleIdentifier,
				$.CLASS,
			)
		),

		equalityOperator: $ => choice(
			$.EXCL_EQ,
			$.EXCL_EQEQ,
			$.EQEQ,
			$.EQEQEQ
		),

		comparisonOperator: $ => choice(
			$.LANGLE,
			$.RANGLE,
			$.LE,
			$.GE
		),

		inOperator: $ => choice(
			$.IN,
			$.NOT_IN
		),

		isOperator: $ => choice(
			$.IS,
			$.NOT_IS
		),

		additiveOperator: $ => choice(
			$.ADD,
			$.SUB
		),

		multiplicativeOperator: $ => choice(
			$.MULT,
			$.DIV,
			$.MOD
		),

		asOperator: $ => choice(
			$.AS,
			$.AS_SAFE
		),

		prefixUnaryOperator: $ => choice(
			$.INCR,
			$.DECR,
			$.SUB,
			$.ADD,
			$.excl
		),

		postfixUnaryOperator: $ => choice(
			$.INCR,
			$.DECR,
			seq(
				$.EXCL_NO_WS,
				$.excl
			)
		),

		excl: $ => choice(
			$.EXCL_NO_WS,
			$.EXCL_WS
		),

		memberAccessOperator: $ => choice(
			$.DOT,
			$.safeNav,
			$.COLONCOLON
		),

		safeNav: $ => seq($.NLSQUEST, $.DOT),

		typeModifiers: $ => prec.right(repeat1($.typeModifier)),

		typeModifier: $ => choice(
			$.annotation,
			seq(
				$.SUSPEND,
				optional($.NLS)
			)
		),

		varianceModifier: $ => choice(
			$.IN,
			$.OUT
		),

		annotation: $ => prec.right(seq(
			choice(
				$.singleAnnotation,
				$.multiAnnotation
			),
			optional($.NLS)
		)),

		singleAnnotation: $ => choice(
			seq(
				$.annotationUseSiteTarget,
				optional($.NLS),
				$.unescapedAnnotation
			),
			seq(
				choice(
					$.AT_NO_WS,
					$.AT_PRE_WS
				),
				$.unescapedAnnotation
			)
		),

		multiAnnotation: $ => choice(
			seq(
				$.annotationUseSiteTarget,
				optional($.NLS),
				$.LSQUARE,
				repeat1($.unescapedAnnotation),
				$.RSQUARE
			),
			seq(
				choice(
					$.AT_NO_WS,
					$.AT_PRE_WS
				),
				$.LSQUARE,
				repeat1($.unescapedAnnotation),
				$.RSQUARE
			)
		),

		annotationUseSiteTarget: $ => seq(
			choice(
				$.AT_NO_WS,
				$.AT_PRE_WS
			),
			choice(
				$.FIELD,
				$.PROPERTY,
				$.GET,
				$.SET,
				$.RECEIVER,
				$.PARAM,
				$.SETPARAM,
				$.DELEGATE
			),
			optional($.NLS),
			$.COLON
		),

		unescapedAnnotation: $ => choice(
			$.constructorInvocation,
			$.userType
		),

		simpleIdentifier: $ => prec(PREC.SIMPLE_IDENTIDIER, choice(
			$.Identifier,
			$.ABSTRACT,
			$.ANNOTATION,
			$.BY,
			$.CATCH,
			$.COMPANION,
			$.CONSTRUCTOR,
			$.CROSSINLINE,
			$.DATA,
			$.DYNAMIC,
			$.ENUM,
			$.EXTERNAL,
			$.FINAL,
			$.FINALLY,
			$.GET,
			$.IMPORT,
			$.INFIX,
			$.INIT,
			$.INLINE,
			$.INNER,
			$.INTERNAL,
			$.LATEINIT,
			$.NOINLINE,
			$.OPEN,
			$.OPERATOR,
			$.OUT,
			$.OVERRIDE,
			$.PRIVATE,
			$.PROTECTED,
			$.PUBLIC,
			$.REIFIED,
			$.SEALED,
			$.TAILREC,
			$.SET,
			$.VARARG,
			$.WHERE,
			$.FIELD,
			$.PROPERTY,
			$.RECEIVER,
			$.PARAM,
			$.SETPARAM,
			$.DELEGATE,
			$.FILE,
			$.EXPECT,
			$.ACTUAL,
			$.CONST,
			$.SUSPEND
		)),

		DelimitedComment: $ => token(seq(
			"/*",
			repeat(/.|\n/),
			"*/"
		)),

		LineComment: $ => token(seq(
			"//",
			repeat(/[^\r\n]/)
		)),

		WS: $ => token(prec.right(repeat1(/[\u0020\u0009\u000C]+/))),

		NLS: $ => token(prec.right(repeat1(/(\n|\r\n)/))),

		Hidden: $ => token(choice(
			seq(
				repeat("\r\n"),
				"/*",
				repeat(/.|\n/),
				"*/"
			),
			token(seq(
				repeat("\r\n"),
				"//",
				repeat(/[^\r\n]/)
			)),
			token(/[\u0020\u0009\u000C]/)
		)),

		DOT: $ => token("."),

		NLSDOT: $ => seq(prec.right(repeat(/(\n|\r\n)/)), "."),

		COMMA: $ => token(","),

		LPAREN: $ => token("("),

		RPAREN: $ => token(")"),

		LSQUARE: $ => token("["),

		RSQUARE: $ => token("]"),

		RCURL: $ => token("}"),

		MULT: $ => token("*"),

		MOD: $ => token("%"),

		DIV: $ => token("/"),

		ADD: $ => token("+"),

		SUB: $ => token("-"),

		INCR: $ => token("++"),

		DECR: $ => token("--"),

		CONJ: $ => token("&&"),

		DISJ: $ => token("||"),

		EXCL_WS: $ => token(seq(
			"!",
			choice(
				seq(
					"/*",
					repeat(/.|\n/),
					"*/"
				),
				token(seq(
					"//",
					repeat(/[^\r\n]/)
				)),
				token(/[\u0020\u0009\u000C]/)
			)
		)),

		EXCL_NO_WS: $ => token("!"),

		COLON: $ => token(":"),

		ASSIGNMENT: $ => token("="),

		ARROW: $ => token("->"),

		RANGE: $ => token(".."),

		COLONCOLON: $ => token("::"),

		AT_NO_WS: $ => token("@"),

		AT_POST_WS: $ => token(seq(
			"@",
			choice(
				choice(
					seq(
						"/*",
						repeat(/.|\n/),
						"*/"
					),
					token(seq(
						"//",
						repeat(/[^\r\n]/)
					)),
					token(/[\u0020\u0009\u000C]/)
				),
				token(choice(
					"\n",
					seq(
						"\r",
						optional("\n")
					)
				))
			)
		)),

		AT_PRE_WS: $ => token(seq(
			choice(
				choice(
					seq(
						"/*",
						repeat(/.|\n/),
						"*/"
					),
					token(seq(
						"//",
						repeat(/[^\r\n]/)
					)),
					token(/[\u0020\u0009\u000C]/)
				),
				token(choice(
					"\n",
					seq(
						"\r",
						optional("\n")
					)
				))
			),
			"@"
		)),

		QUEST_WS: $ => token(seq(
			"?",
			choice(
				seq(
					"/*",
					repeat(/.|\n/),
					"*/"
				),
				token(seq(
					"//",
					repeat(/[^\r\n]/)
				)),
				token(/[\u0020\u0009\u000C]/)
			)
		)),

		NLSQUEST: $ => /(\n|\r\n)*\?/,

		QUEST: $ => token("?"),

		LANGLE: $ => token("<"),

		RANGLE: $ => token(">"),

		LE: $ => token("<="),

		GE: $ => token(">="),

		EXCL_EQ: $ => token("!="),

		EXCL_EQEQ: $ => token("!=="),

		AS_SAFE: $ => token("as?"),

		EQEQ: $ => token("=="),

		EQEQEQ: $ => token("==="),

		RETURN_AT: $ => token(seq(
			"return@",
			choice(
				seq(
					choice(
						/[a-zA-Z]/,
						"_"
					),
					repeat(choice(
						/[a-zA-Z]/,
						"_",
						/[0-9]/
					))
				),
				seq(
					"`",
					repeat1(/[^\r\n`]/),
					"`"
				)
			)
		)),

		CONTINUE_AT: $ => token(seq(
			"continue@",
			choice(
				seq(
					choice(
						/[a-zA-Z]/,
						"_"
					),
					repeat(choice(
						/[a-zA-Z]/,
						"_",
						/[0-9]/
					))
				),
				seq(
					"`",
					repeat1(/[^\r\n`]/),
					"`"
				)
			)
		)),

		BREAK_AT: $ => token(seq(
			"break@",
			choice(
				seq(
					choice(
						/[a-zA-Z]/,
						"_"
					),
					repeat(choice(
						/[a-zA-Z]/,
						"_",
						/[0-9]/
					))
				),
				seq(
					"`",
					repeat1(/[^\r\n`]/),
					"`"
				)
			)
		)),

		THIS_AT: $ => token(seq(
			"this@",
			choice(
				seq(
					choice(
						/[a-zA-Z]/,
						"_"
					),
					repeat(choice(
						/[a-zA-Z]/,
						"_",
						/[0-9]/
					))
				),
				seq(
					"`",
					repeat1(/[^\r\n`]/),
					"`"
				)
			)
		)),

		SUPER_AT: $ => token(seq(
			"super@",
			choice(
				seq(
					choice(
						/[a-zA-Z]/,
						"_"
					),
					repeat(choice(
						/[a-zA-Z]/,
						"_",
						/[0-9]/
					))
				),
				seq(
					"`",
					repeat1(/[^\r\n`]/),
					"`"
				)
			)
		)),

		FILE: $ => token("file"),

		FIELD: $ => token("field"),

		PROPERTY: $ => token("property"),

		GET: $ => token("get"),

		SET: $ => token("set"),

		RECEIVER: $ => token("receiver"),

		PARAM: $ => token("param"),

		SETPARAM: $ => token("setparam"),

		DELEGATE: $ => token("delegate"),

		IMPORT: $ => token("import"),

		CLASS: $ => token("class"),

		CONSTRUCTOR: $ => token("constructor"),

		BY: $ => token("by"),

		COMPANION: $ => token("companion"),

		INIT: $ => token("init"),

		THIS: $ => token("this"),

		SUPER: $ => token("super"),

		WHERE: $ => token("where"),

		CATCH: $ => token("catch"),

		FINALLY: $ => token("finally"),

		THROW: $ => token("throw"),

		RETURN: $ => token("return"),

		CONTINUE: $ => token("continue"),

		BREAK: $ => token("break"),

		AS: $ => token("as"),

		IS: $ => token("is"),

		IN: $ => token("in"),

		NOT_IS: $ => token(seq(
			"!is",
			choice(
				choice(
					seq(
						"/*",
						repeat(/.|\n/),
						"*/"
					),
					token(seq(
						"//",
						repeat(/[^\r\n]/)
					)),
					token(/[\u0020\u0009\u000C]/)
				),
				token(choice(
					"\n",
					seq(
						"\r",
						optional("\n")
					)
				))
			)
		)),

		NOT_IN: $ => token(seq(
			"!in",
			choice(
				choice(
					seq(
						"/*",
						repeat(/.|\n/),
						"*/"
					),
					token(seq(
						"//",
						repeat(/[^\r\n]/)
					)),
					token(/[\u0020\u0009\u000C]/)
				),
				token(choice(
					"\n",
					seq(
						"\r",
						optional("\n")
					)
				))
			)
		)),

		OUT: $ => token("out"),

		DYNAMIC: $ => token("dynamic"),

		PUBLIC: $ => token("public"),

		PRIVATE: $ => token("private"),

		PROTECTED: $ => token("protected"),

		INTERNAL: $ => token("internal"),

		ENUM: $ => token("enum"),

		SEALED: $ => token("sealed"),

		ANNOTATION: $ => token("annotation"),

		DATA: $ => token("data"),

		INNER: $ => token("inner"),

		TAILREC: $ => token("tailrec"),

		OPERATOR: $ => token("operator"),

		INLINE: $ => token("inline"),

		INFIX: $ => token("infix"),

		EXTERNAL: $ => token("external"),

		SUSPEND: $ => token("suspend"),

		OVERRIDE: $ => token("override"),

		ABSTRACT: $ => token("abstract"),

		FINAL: $ => token("final"),

		OPEN: $ => token("open"),

		CONST: $ => token("const"),

		LATEINIT: $ => token("lateinit"),

		VARARG: $ => token("vararg"),

		NOINLINE: $ => token("noinline"),

		CROSSINLINE: $ => token("crossinline"),

		REIFIED: $ => token("reified"),

		EXPECT: $ => token("expect"),

		ACTUAL: $ => token("actual"),

		DecDigit: $ => token(/[0123456789]/),

		DecDigitNoZero: $ => token(/[123456789]/),

		DecDigitOrSeparator: $ => token(choice(
			token(/[0123456789]/),
			"_"
		)),

		DecDigits: $ => token(choice(
			seq(
				token(/[0123456789]/),
				repeat(choice(
					token(/[0123456789]/),
					"_"
				)),
				token(/[0123456789]/)
			),
			token(/[0123456789]/)
		)),

		DoubleExponent: $ => token(seq(
			/[eE]/,
			optional(/[+-]/),
			choice(
				seq(
					token(/[0123456789]/),
					repeat(choice(
						token(/[0123456789]/),
						"_"
					)),
					token(/[0123456789]/)
				),
				token(/[0123456789]/)
			)
		)),

		RealLiteral: $ => token(choice(
			choice(
				seq(
					choice(
						seq(
							optional(choice(
								seq(
									token(/[0123456789]/),
									repeat(choice(
										token(/[0123456789]/),
										"_"
									)),
									token(/[0123456789]/)
								),
								token(/[0123456789]/)
							)),
							".",
							choice(
								seq(
									token(/[0123456789]/),
									repeat(choice(
										token(/[0123456789]/),
										"_"
									)),
									token(/[0123456789]/)
								),
								token(/[0123456789]/)
							),
							optional(seq(
								/[eE]/,
								optional(/[+-]/),
								choice(
									seq(
										token(/[0123456789]/),
										repeat(choice(
											token(/[0123456789]/),
											"_"
										)),
										token(/[0123456789]/)
									),
									token(/[0123456789]/)
								)
							))
						),
						seq(
							choice(
								seq(
									token(/[0123456789]/),
									repeat(choice(
										token(/[0123456789]/),
										"_"
									)),
									token(/[0123456789]/)
								),
								token(/[0123456789]/)
							),
							seq(
								/[eE]/,
								optional(/[+-]/),
								choice(
									seq(
										token(/[0123456789]/),
										repeat(choice(
											token(/[0123456789]/),
											"_"
										)),
										token(/[0123456789]/)
									),
									token(/[0123456789]/)
								)
							)
						)
					),
					/[fF]/
				),
				seq(
					choice(
						seq(
							token(/[0123456789]/),
							repeat(choice(
								token(/[0123456789]/),
								"_"
							)),
							token(/[0123456789]/)
						),
						token(/[0123456789]/)
					),
					/[fF]/
				)
			),
			choice(
				seq(
					optional(choice(
						seq(
							token(/[0123456789]/),
							repeat(choice(
								token(/[0123456789]/),
								"_"
							)),
							token(/[0123456789]/)
						),
						token(/[0123456789]/)
					)),
					".",
					choice(
						seq(
							token(/[0123456789]/),
							repeat(choice(
								token(/[0123456789]/),
								"_"
							)),
							token(/[0123456789]/)
						),
						token(/[0123456789]/)
					),
					optional(seq(
						/[eE]/,
						optional(/[+-]/),
						choice(
							seq(
								token(/[0123456789]/),
								repeat(choice(
									token(/[0123456789]/),
									"_"
								)),
								token(/[0123456789]/)
							),
							token(/[0123456789]/)
						)
					))
				),
				seq(
					choice(
						seq(
							token(/[0123456789]/),
							repeat(choice(
								token(/[0123456789]/),
								"_"
							)),
							token(/[0123456789]/)
						),
						token(/[0123456789]/)
					),
					seq(
						/[eE]/,
						optional(/[+-]/),
						choice(
							seq(
								token(/[0123456789]/),
								repeat(choice(
									token(/[0123456789]/),
									"_"
								)),
								token(/[0123456789]/)
							),
							token(/[0123456789]/)
						)
					)
				)
			)
		)),

		FloatLiteral: $ => token(choice(
			seq(
				choice(
					seq(
						optional(choice(
							seq(
								token(/[0123456789]/),
								repeat(choice(
									token(/[0123456789]/),
									"_"
								)),
								token(/[0123456789]/)
							),
							token(/[0123456789]/)
						)),
						".",
						choice(
							seq(
								token(/[0123456789]/),
								repeat(choice(
									token(/[0123456789]/),
									"_"
								)),
								token(/[0123456789]/)
							),
							token(/[0123456789]/)
						),
						optional(seq(
							/[eE]/,
							optional(/[+-]/),
							choice(
								seq(
									token(/[0123456789]/),
									repeat(choice(
										token(/[0123456789]/),
										"_"
									)),
									token(/[0123456789]/)
								),
								token(/[0123456789]/)
							)
						))
					),
					seq(
						choice(
							seq(
								token(/[0123456789]/),
								repeat(choice(
									token(/[0123456789]/),
									"_"
								)),
								token(/[0123456789]/)
							),
							token(/[0123456789]/)
						),
						seq(
							/[eE]/,
							optional(/[+-]/),
							choice(
								seq(
									token(/[0123456789]/),
									repeat(choice(
										token(/[0123456789]/),
										"_"
									)),
									token(/[0123456789]/)
								),
								token(/[0123456789]/)
							)
						)
					)
				),
				/[fF]/
			),
			seq(
				choice(
					seq(
						token(/[0123456789]/),
						repeat(choice(
							token(/[0123456789]/),
							"_"
						)),
						token(/[0123456789]/)
					),
					token(/[0123456789]/)
				),
				/[fF]/
			)
		)),

		DoubleLiteral: $ => token(choice(
			seq(
				optional(choice(
					seq(
						token(/[0123456789]/),
						repeat(choice(
							token(/[0123456789]/),
							"_"
						)),
						token(/[0123456789]/)
					),
					token(/[0123456789]/)
				)),
				".",
				choice(
					seq(
						token(/[0123456789]/),
						repeat(choice(
							token(/[0123456789]/),
							"_"
						)),
						token(/[0123456789]/)
					),
					token(/[0123456789]/)
				),
				optional(seq(
					/[eE]/,
					optional(/[+-]/),
					choice(
						seq(
							token(/[0123456789]/),
							repeat(choice(
								token(/[0123456789]/),
								"_"
							)),
							token(/[0123456789]/)
						),
						token(/[0123456789]/)
					)
				))
			),
			seq(
				choice(
					seq(
						token(/[0123456789]/),
						repeat(choice(
							token(/[0123456789]/),
							"_"
						)),
						token(/[0123456789]/)
					),
					token(/[0123456789]/)
				),
				seq(
					/[eE]/,
					optional(/[+-]/),
					choice(
						seq(
							token(/[0123456789]/),
							repeat(choice(
								token(/[0123456789]/),
								"_"
							)),
							token(/[0123456789]/)
						),
						token(/[0123456789]/)
					)
				)
			)
		)),

		IntegerLiteral: $ => token(choice(
			seq(
				token(/[123456789]/),
				repeat(choice(
					token(/[0123456789]/),
					"_"
				)),
				token(/[0123456789]/)
			),
			token(/[0123456789]/)
		)),

		HexDigit: $ => token(/[0-9a-fA-F]/),

		HexDigitOrSeparator: $ => token(choice(
			token(/[0-9a-fA-F]/),
			"_"
		)),

		HexLiteral: $ => token(choice(
			seq(
				"0",
				/[xX]/,
				token(/[0-9a-fA-F]/),
				repeat(choice(
					token(/[0-9a-fA-F]/),
					"_"
				)),
				token(/[0-9a-fA-F]/)
			),
			seq(
				"0",
				/[xX]/,
				token(/[0-9a-fA-F]/)
			)
		)),

		BinDigit: $ => token(/[01]/),

		BinDigitOrSeparator: $ => token(choice(
			token(/[01]/),
			"_"
		)),

		BinLiteral: $ => token(choice(
			seq(
				"0",
				/[bB]/,
				token(/[01]/),
				repeat(choice(
					token(/[01]/),
					"_"
				)),
				token(/[01]/)
			),
			seq(
				"0",
				/[bB]/,
				token(/[01]/)
			)
		)),

		UnsignedLiteral: $ => token(seq(
			choice(
				choice(
					seq(
						token(/[123456789]/),
						repeat(choice(
							token(/[0123456789]/),
							"_"
						)),
						token(/[0123456789]/)
					),
					token(/[0123456789]/)
				),
				choice(
					seq(
						"0",
						/[xX]/,
						token(/[0-9a-fA-F]/),
						repeat(choice(
							token(/[0-9a-fA-F]/),
							"_"
						)),
						token(/[0-9a-fA-F]/)
					),
					seq(
						"0",
						/[xX]/,
						token(/[0-9a-fA-F]/)
					)
				),
				choice(
					seq(
						"0",
						/[bB]/,
						token(/[01]/),
						repeat(choice(
							token(/[01]/),
							"_"
						)),
						token(/[01]/)
					),
					seq(
						"0",
						/[bB]/,
						token(/[01]/)
					)
				)
			),
			/[uU]/,
			optional("L")
		)),

		LongLiteral: $ => token(seq(
			choice(
				choice(
					seq(
						token(/[123456789]/),
						repeat(choice(
							token(/[0123456789]/),
							"_"
						)),
						token(/[0123456789]/)
					),
					token(/[0123456789]/)
				),
				choice(
					seq(
						"0",
						/[xX]/,
						token(/[0-9a-fA-F]/),
						repeat(choice(
							token(/[0-9a-fA-F]/),
							"_"
						)),
						token(/[0-9a-fA-F]/)
					),
					seq(
						"0",
						/[xX]/,
						token(/[0-9a-fA-F]/)
					)
				),
				choice(
					seq(
						"0",
						/[bB]/,
						token(/[01]/),
						repeat(choice(
							token(/[01]/),
							"_"
						)),
						token(/[01]/)
					),
					seq(
						"0",
						/[bB]/,
						token(/[01]/)
					)
				)
			),
			"L"
		)),

		BooleanLiteral: $ => token(choice(
			"true",
			"false"
		)),

		NullLiteral: $ => token("null"),

		CharacterLiteral: $ => token(seq(
			"\'",
			choice(
				choice(
					seq(
						"\\",
						"u",
						token(/[0-9a-fA-F]/),
						token(/[0-9a-fA-F]/),
						token(/[0-9a-fA-F]/),
						token(/[0-9a-fA-F]/)
					),
					token(seq(
						"\\",
						choice(
							"t",
							"b",
							"r",
							"n",
							"\'",
							"\"",
							"\\",
							"$"
						)
					))
				),
				/[^\n\r'\\]/
			),
			"\'"
		)),

		Identifier: $ => token(choice(
			seq(
				choice(
					/[a-zA-Z]/,
					"_"
				),
				repeat(choice(
					/[a-zA-Z]/,
					"_",
					/[0-9]/
				))
			),
			seq(
				"`",
				repeat1(/[^\r\n`]/),
				"`"
			)
		)),

		EOF: $ => token(/[\r\n]/),

	}
});

function sep1(rule, separator) {
	return seq(rule, repeat(seq(separator, rule)));
}
