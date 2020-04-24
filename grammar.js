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

	// precedence is here for not allowing such constructions looking like (incomplete) infix call:
	// val x: Int = 1 get
	// class A<T>(val x : I) : I by x where T : I
	INFIX_CALL: 0,
	ELVIS: -1,
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
		[$.primaryExpression, $.simpleUserType, $.directlyAssignableExpression, $.variable_declaration],

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

		// 'val (@A C).x' and 'val (@A x)'
		[$.variable_declaration, $.typeModifier],

		// '{ (@A T?)::x }', '{ (@a x) -> x }', '{ (@a x) }'
		[$.variable_declaration, $.typeModifier, $.unaryPrefix],

		// 'val (C).x' and 'val (x)'
		[$.variable_declaration, $.simpleUserType],

		// 'when (@A @A x) {}' and 'when (@A @A val x = 1) {}'
		[$.unaryPrefix, $.when_subject],
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

		source_file: $ => seq(
			optional($.shebang_line),
			optional($.NLS),
			optional(seq(repeat1($.file_annotation))),
			optional($.package_header),
			repeat($.import_header),
			repeat(seq($._statement, $.semis)),
			optional($._statement)
		),

		// TODO:
		// should we distinguish script and
		// kotlinFile where only top-level objects should be allowed?

		shebang_line: $ => /#![^\r\n]*/,

		file_annotation: $ => seq(
			"@file",
			optional($.NLS),
			$.COLON,
			optional($.NLS),
			choice(
				seq($.LSQUARE, repeat1($.unescaped_annotation), $.RSQUARE),
				$.unescaped_annotation
			),
			optional($.NLS),
		),

		package_header: $ => seq("package", $.identifier, optional($.semi)),

		import_header: $ => seq(
			$.IMPORT,
			$.identifier,
			optional(choice(seq(".*"), $.import_alias)),
			optional($.semi),
		),

		// TODO: why type identifier by default?
		import_alias: $ => seq("as", alias($.simpleIdentifier, $.type_identifier)),

		type_alias: $ => seq(
			optional($.modifiers),
			"typealias",
			optional($.NLS),
			alias($.simpleIdentifier, $.type_identifier),
			optional(seq(
				optional($.NLS),
				$.type_parameters,
			)),
			optional($.NLS),
			"=",
			$.type
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

		class_declaration: $ => seq(
			optional($.modifiers),
			choice($.CLASS, "interface"),
			optional($.NLS),
			alias($.simpleIdentifier, $.type_identifier),
			optional(seq(
				// TODO: all omitted NLS
				//optional($.NLS),
				$.type_parameters,
			)),
			optional(seq(
				//optional($.NLS),
				$.primary_constructor,
			)),
			optional(seq(
				//optional($.NLS),
				$.COLON,
				optional($.NLS),
				$._delegation_specifiers
			)),
			optional(seq(
				//optional($.NLS),
				$.type_constraints,
			)),
			optional(choice(
				seq(
					//$.NLS,
					$.class_body,
				),
				seq(
					//$.NLS,
					$.enum_class_body,
				)
			))
		),

		primary_constructor: $ => seq(
			optional(seq(
				optional($.modifiers),
				$.CONSTRUCTOR,
				optional($.NLS)
			)),
			$._class_parameters
		),

		class_body: $ => seq(
			$.LCURL,
			optional($.NLS),
			optional($._class_member_declarations),
			$.RCURL
		),

		_class_parameters: $ => seq(
			$.LPAREN,
			optional($.NLS),
			optional(sep1(
				seq($.class_parameter, optional($.NLS)),
				seq(",", optional($.NLS))
			)),
			$.RPAREN,
		),

		class_parameter: $ => seq(
			optional(seq(
				optional($.modifiers),
				choice(
					"val",
					"var"
				),
				optional($.NLS),
			)),
			$.simpleIdentifier,
			":",
			optional($.NLS),
			$.type,
			optional(seq(
				// TODO
				//optional($.NLS),
				"=",
				optional($.NLS),
				$._expression
			))
		),

		_delegation_specifiers: $ => prec.left(sep1(
			$._annotated_delegation_specifier,
			seq(
				// TODO
				//optional($.NLS),
				",",
				//optional($.NLS),
			)
		)),

		delegation_specifier: $ => prec.left(choice(
			$.constructor_invocation,
			$.explicit_delegation,
			$.user_type,
			$.function_type
		)),

		constructor_invocation: $ => seq(
			$.userType,
			$.valueArguments
		),

		_annotated_delegation_specifier: $ => seq(
			optional(seq(
				$._annotations,
				optional($.NLS),
			)),
			$.delegation_specifier,
		),

		explicit_delegation: $ => seq(
			choice(
				$.user_type,
				$.function_type
			),
			optional($.NLS),
			"by",
			optional($.NLS),
			$.expression
		),

		type_parameters: $ => seq(
			$.LANGLE,
			optional($.NLS),
			sep1(
				seq($.type_parameter, optional($.NLS)),
				seq(",", optional($.NLS))
			),
			$.RANGLE
		),

		type_parameter: $ => seq(
			optional(seq(
				$.type_parameter_modifiers,
				optional($.NLS),
			)),
			alias($.simpleIdentifier, $.type_identifier),
			optional(seq(
				//TODO:
				//optional($.NLS),
				$.COLON,
				optional($.NLS),
				$.type
			))
		),

		type_constraints: $ => seq(
			"where",
			optional($.NLS),
			sep1(
				$.type_constraint,
				seq(
					// TODO:
					//optional($.NLS),
					$.COMMA,
					optional($.NLS))
			)
		),

		type_constraint: $ => seq(
			optional($._annotations),
			alias($.simpleIdentifier, $.type_identifier),
			optional($.NLS),
			$.COLON,
			optional($.NLS),
			$.type
		),

		// ==========
		// Class members
		// ==========

		_class_member_declarations: $ => repeat1(seq(
			$._class_member_declaration,
			// TODO should be optional
			$.semis
			//optional($._semis)
		)),

		_class_member_declaration: $ => choice(
			$._declaration,
			$.companion_object,
			$.anonymous_initializer,
			$.secondary_constructor
		),

		anonymous_initializer: $ => seq(
			$.INIT,
			optional($.NLS),
			$.block
		),

		companion_object: $ => seq(
			optional($.modifiers),
			$.COMPANION,
			optional($.NLS),
			"object",
			optional(seq(
				// TODO
				//optional($.NLS),
				alias($.simpleIdentifier, $.type_identifier)
			)),
			optional(seq(
				//optional($.NLS),
				$.COLON,
				optional($.NLS),
				$._delegation_specifiers
			)),
			optional(seq(
				//optional($.NLS),
				$.class_body
			))
		),

		_function_value_parameters: $ => seq(
			"(",
			optional($.NLS),
			optional(sep1(
				seq($._function_value_parameter, optional($.NLS)),
				seq($.COMMA, optional($.NLS)))),
			")"
		),

		_function_value_parameter: $ => seq(
			optional($.parameter_modifiers),
			$.parameter,
			optional(seq(
				// TODO
				//optional($.NLS),
				"=",
				optional($.NLS),
				$._expression
			))
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
			$.simpleIdentifier,
			optional($.NLS),
			$._function_value_parameters,
			optional(seq(
				// TODO
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
			optional($._annotations),
			// TODO
			//optional($.NLS),
			$.simpleIdentifier,
			optional(seq(
				//optional($.NLS),
				":",
				optional($.NLS),
				$._type
			))
		),

		multi_variable_declaration: $ => seq(
		    $.LPAREN,
		    optional($.NLS),
		    sep1(
		    	seq(
		    		$.variable_declaration,
					// TODO
					//optional($.NLS)
				),
				seq(
					$.COMMA,
					optional($.NLS)
				),
			),
			$.RPAREN
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
			choice(
				$.variable_declaration,
				$.multi_variable_declaration
			),
			optional(seq(
				optional($.NLS),
				$.type_constraints
			)),
			optional(choice(
				seq(
					optional($.NLS),
					"=",
					optional($.NLS),
					$._expression
				),
				seq(
					optional($.NLS),
					$.property_delegate
				)
			)),
			choice(
				seq(
					optional(seq(
						// TODO
						//$.NLS,
						$.semi,
					)),
					optional($.getter),
					optional(seq(
						// TODO
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

		property_delegate: $ => seq(
			"by",
			optional($.NLS),
			$._expression
		),

		getter: $ => seq(
			optional($.modifiers),
			"get",
			optional(seq(
				// TODO
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
				// TODO
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
				// TODO
				//optional($.NLS),
				$.COLON,
				optional($.NLS),
				$._type
			))
		),

		parameter: $ => seq(
			$.simpleIdentifier,
			// TODO
			//optional($.NLS),
			$.COLON,
			optional($.NLS),
			$.type
		),

		object_declaration: $ => seq(
			optional($.modifiers),
			"object",
			optional($.NLS),
			alias($.simpleIdentifier, $.type_identifier),
			optional(seq(
				// TODO
				//optional($.NLS),
				":",
				optional($.NLS),
				$._delegation_specifiers
			)),
			optional(seq(
				//optional($.NLS),
				$.class_body
			))
		),

		secondary_constructor: $ => seq(
			optional($.modifiers),
			$.CONSTRUCTOR,
			optional($.NLS),
			$._function_value_parameters,
			optional(seq(
				// TODO
				//optional($.NLS),
				":",
				optional($.NLS),
				$.constructor_delegation_call)),
			optional(seq(
				//optional($.NLS),
				$.block
			))
		),

		constructor_delegation_call: $ => seq(
			choice("this", "super"),
			optional($.NLS),
			$.value_arguments
		),

		// ==========
		// Enum classes
		// ==========

		enum_class_body: $ => seq(
			$.LCURL,
			optional($.NLS),
			$._enum_entries,
			optional(seq(
				";",
				optional($.NLS),
				optional($._class_member_declarations),
			)),
			$.RCURL
		),

		_enum_entries: $ => seq(
			sep1(
				seq($.enum_entry),
				seq(
					optional($.NLS),
					$.COMMA,
					optional($.NLS)
				)
			),
			optional(seq(
				optional($.NLS),
				$.COMMA
			)),
			optional($.NLS),
		),

		enum_entry: $ => seq(
			optional(seq(
				$.modifiers,
				optional($.NLS),
			)),
			$.simpleIdentifier,
			optional(seq(
				// TODO
				//optional($.NLS),
				$.value_arguments
			)),
			optional(seq(
				//optional($.NLS),
				$.class_body
			))
		),

		// ==========
		// Types
		// ==========

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

		nullableType: $ => seq(
			choice(
				$.typeReference,
				$.parenthesizedType
			),
			//optional($.NLS),
			repeat1($.quest)
		),

		// TODO spaces, comments and newlines around question marks
		quest: $ => $.NLSQUEST,

		// here qualified type is left-associative,
		// in the specification it is simply list
		userType: $ => seq(
			optional(seq(
				$.userType,
				alias($.NLSDOT, $.DOT),
				optional($.NLS)
			)),
			$.simpleUserType,
		),

		// Precedence here resolves conflicts like 'if (x is C<false) {}'.
		// This ambiguous (not valid) expression is parsed differently by kotlin parser and specification.
		// Right precedence behaves more like the kotlin parser.
		simpleUserType: $ => prec.right(seq(
			alias($.simpleIdentifier, $.type_identifier),
			optional(seq(
				// TODO
				//optional($.NLS),
				$.typeArguments
			)
		))),

		typeProjection: $ => choice(
			seq(
				optional($.typeProjectionModifiers),
				$.type
			),
			$.MULT
		),

		// Precedence here resolves conflicts like 'L<out @A T>'.
		// This ambiguous type is parsed differently by kotlin parser and specification.
		// Right precedence behaves more like the specification.
		typeProjectionModifiers: $ => prec.right(repeat1($.typeProjectionModifier)),

		// Precedence here is more than in typeModifier
		// to recognize annotation as projection modifier where possible
		// instead of type modifier
		// see typeProjectionModifiers
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
			// TODO
			//optional($.NLS),
			$.ARROW,
			optional($.NLS),
			$.type
		),

		// Precedence here is to parse ambiguous expression 'l { a : (Int) -> b }'
		// as function type instead of expression body
		functionTypeParameters: $ => prec(1, seq(
			$.LPAREN,
			optional(seq(optional($.NLS), choice(
				$.parameter,
				$.type
			))),
			repeat(seq(
				// TODO
				//optional($.NLS),
				$.COMMA,
				optional($.NLS),
				choice(
					$.parameter,
					$.type
				)
			)),
			// TODO
			//optional($.NLS),
			$.RPAREN
		)),

		parenthesizedType: $ => seq(
			$.LPAREN,
			optional($.NLS),
			$.type,
			// TODO
			//optional($.NLS),
			$.RPAREN
		),

		receiverType: $ => seq(
			// it seems there are no places where type modifiers should
			// be applied to receiver type, not for expression/function/property/function type
			//optional($.typeModifiers),
			choice(
				$.parenthesizedType,
				$.nullableType,
				$.typeReference
			)
		),

		receiverTypeWithDot: $ => seq(
			$.receiverType,
			alias($.NLSDOT, $.DOT),
			optional($.NLS),
		),

		// ==========
		// Statements
		// ==========

		statements: $ => seq(
			$._statement,
			repeat(seq($.semis, $._statement)),
			optional($.semis),
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

		label: $ => seq(
			$.simpleIdentifier,
			choice(
				$.AT_NO_WS,
				$.AT_POST_WS
			),
			// TODO
			//optional($.NLS)
		),

		control_structure_body: $ => choice(
			$.block,
			$._statement
		),

		// Here the rule differs from specification since specification
		// does not support blocks like '{ ; }'
		block: $ => prec(PREC.BLOCK, seq(
			$.LCURL,
			optional(choice(
				seq(optional($.NLS), $.statements),
				$.semis
			)),
			$.RCURL,
		)),

		_loop_statement: $ => choice(
			$.for_statement,
			$.while_statement,
			$.do_while_statement
		),

		for_statement: $ => prec.right(seq(
			"for",
			optional($.NLS),
			$.LPAREN,
			choice(
				$.variable_declaration,
				seq(
					$._annotations,
					$.multi_variable_declaration,
				),
			),
			"in",
			$._expression,
			$.RPAREN,
			optional(seq(
				// TODO
				//optional($.NLS),
				$.control_structure_body
			))
		)),

		while_statement: $ => seq(
			"while",
			optional($.NLS),
			$.LPAREN,
			$._expression,
			$.RPAREN,
			optional($.NLS),
			choice(";", $.control_structure_body)
		),

		// Precedence here is more that in while_statement to recognize such construction as
		// 'do while (true); while (true);' as two statements instead of single one.
		// Note: specification grammar fails for this example
		do_while_statement: $ => prec(1, seq(
			"do",
			optional($.NLS),
			optional(seq(
				$.control_structure_body,
				optional($.NLS),
			)),
			"while",
			optional($.NLS),
			$.LPAREN,
			$._expression,
			$.RPAREN,
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
				$.assignmentAndOperator,
				optional($.NLS),
				$.expression
			),
		),

		// associativity here should not affect grammar semantics
		// TODO: double semicolon (without whitespace) should be prohibited
		semi: $ => prec.right(choice(
			seq(";", optional($.NLS)),
			$.NLS
		)),

		semis: $ => choice(
			$.NLS,
			seq(
				optional($.NLS),
				";",
				sep1(
					optional($.NLS),
					";"
			    )
			)
		),

		// ==========
		// Expressions
		// ==========

		expression: $ => choice(
			$.disjunction,
			// return and similar (let call them right recursive) expressions break obvious precedence model
			// with such expressions as
			// '1 + return 2 + 3'
			// 'true && if (false) true else false || true'
			// To resolve this grammar conflict we create additional
			// hierarchy of expression nonterminals to explicitly
			// express those language constructions which end
			// with end with right recursive expressions
			$.disjunctionWithReturn,
		),

		rightRecursiveExpression: $ => choice(
			$.jumpExpression,
			//$.if_expression,
		),

		disjunctionWithReturn: $ => choice(
			$.conjunctionWithReturn,
			seq(
				$.disjunction,
				// TODO
				//optional($.NLS),
				$.DISJ,
				optional($.NLS),
				$.rightRecursiveExpression,
			)
		),

		disjunction: $ => choice(
			$.conjunction,
			seq(
				$.disjunction,
				// TODO
				//optional($.NLS),
				$.DISJ,
				optional($.NLS),
				$.conjunction,
			)
		),

		conjunctionWithReturn: $ => choice(
			$.equalityWithReturn,
			seq(
				$.conjunction,
				// TODO
				//optional($.NLS),
				$.CONJ,
				optional($.NLS),
				$.rightRecursiveExpression,
			)
		),

		conjunction: $ => choice(
			$.equality,
			seq(
				$.conjunction,
				// TODO
				//optional($.NLS),
				$.CONJ,
				optional($.NLS),
				$.equality,
			)
		),

		equalityWithReturn: $ => choice(
			$.comparisonWithReturn,
			seq(
				$.equality,
				$.equalityOperator,
				optional($.NLS),
				$.rightRecursiveExpression,
			)
		),

		equality: $ => choice(
			$.comparison,
			seq(
				$.equality,
				$.equalityOperator,
				optional($.NLS),
				$.comparison
			)
		),

		comparisonWithReturn: $ => choice(
			$.infixOperationWithReturn,
			seq(
				$.infixOperation,
				$.comparisonOperator,
				optional($.NLS),
				$.rightRecursiveExpression,
			)
		),

		comparison: $ => choice(
			$.infixOperation,
			seq(
				$.infixOperation,
				$.comparisonOperator,
				optional($.NLS),
				$.infixOperation
			)
		),

		infixOperationWithReturn: $ => choice(
			$.elvisExpressionWithReturn,
			seq(
				$.infixOperation,
				$.inOperator,
				optional($.NLS),
				$.rightRecursiveExpression,
			),
		),

		infixOperation: $ => choice(
			$.elvisExpression,
			seq(
				$.infixOperation,
				$.inOperator,
				optional($.NLS),
				$.elvisExpression
			),
			seq(
				$.infixOperation,
				$.isOperator,
				optional($.NLS),
				$.type
			),
		),

		elvisExpressionWithReturn: $ => choice(
			$.infixFunctionCallWithReturn,
			seq(
				$.elvisExpression,
				// TODO
				//optional($.NLS),
				$.elvis,
				optional($.NLS),
				$.rightRecursiveExpression,
			)
		),

		// precedence here should be less than in infixCall
		elvisExpression: $ => prec(PREC.ELVIS, choice(
			$.infixFunctionCall,
			seq(
				$.elvisExpression,
				// TODO
				//optional($.NLS),
				$.elvis,
				optional($.NLS),
				$.infixFunctionCall,
			)
		)),

		// TODO: specification grammar do the trick with lexing elvis
		// using QUEST_NO_WS token which do not allow spaces after it
		// Here we use another trick with additional nullableCallable token
		// See also: '?.' and '@' tokens which also have some
		// nontrivial relationship with spaces
		elvis: $ => "?:",
		nullableCallable: $ => "?::",

		// precedence here should be more than in elvisExpression
		infixFunctionCallWithReturn: $ => prec(PREC.INFIX_CALL, choice(
			$.rangeExpressionWithReturn,
			seq(
				$.infixFunctionCall,
				$.simpleIdentifier,
				optional($.NLS),
				$.rightRecursiveExpression,
			)
		)),

		// precedence here should be less than in elvisExpression
		infixFunctionCall: $ => prec(PREC.INFIX_CALL, choice(
			$.rangeExpression,
			seq(
				$.infixFunctionCall,
				$.simpleIdentifier,
				optional($.NLS),
				$.rangeExpression
			)
		)),

		rangeExpressionWithReturn: $ => choice(
			$.additiveExpressionWithReturn,
			seq(
				$.rangeExpression,
				$.RANGE,
				optional($.NLS),
				$.rightRecursiveExpression,
			),
		),

		rangeExpression: $ => choice(
			$.additiveExpression,
			seq(
				$.rangeExpression,
				$.RANGE,
				optional($.NLS),
				$.additiveExpression
			),
		),

		additiveExpressionWithReturn: $ => choice(
			$.multiplicativeExpressionWithReturn,
			seq(
				$.additiveExpression,
				$.additiveOperator,
				optional($.NLS),
				$.rightRecursiveExpression,
			),
		),

		additiveExpression: $ => choice(
			$.multiplicativeExpression,
			seq(
				$.additiveExpression,
				$.additiveOperator,
				optional($.NLS),
				$.multiplicativeExpression
			),
		),

		multiplicativeExpressionWithReturn: $ => choice(
			$.asExpressionWithReturn,
			seq(
				$.multiplicativeExpression,
				$.multiplicativeOperator,
				optional($.NLS),
				$.rightRecursiveExpression,
			)
		),

		multiplicativeExpression: $ => choice(
			$.asExpression,
			seq(
				$.multiplicativeExpression,
				$.multiplicativeOperator,
				optional($.NLS),
				$.asExpression
			)
		),

		asExpressionWithReturn: $ => choice(
			$.prefixUnaryExpressionWithReturn,
		),

		asExpression: $ => seq(
			$.prefixUnaryExpression,
			optional(seq(
				// TODO
				//optional($.NLS),
				$.asOperator,
				optional($.NLS),
				$.type
			))
		),

		prefixUnaryExpressionWithReturn: $ => seq(
			repeat($.unaryPrefix),
			$.rightRecursiveExpression,
		),

		prefixUnaryExpression: $ => seq(
			repeat($.unaryPrefix),
			$.postfixUnaryExpression
		),

		// precedence should be less that for valueArgument
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
			$.typeArguments,
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
			// TODO
			//optional($.NLS),
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
			// TODO
			//optional($.NLS),
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
			// TODO
			//optional($.NLS),
			$.memberAccessOperator,
			optional($.NLS),
			choice(
				$.simpleIdentifier,
				$.parenthesizedExpression,
				$.CLASS
			)
		),

		// TODO right precedence here leads to confusing
		//  such constructions as 'g(x) i + 2' with labeled lambda like 'g(x) i@{ }'
		callSuffix: $ => prec.right(choice(
			seq(
				// typeArguments here are always consumed by the
				// rule for postfixUnarySuffix
				//optional($.typeArguments),
				optional($.valueArguments),
				$.annotated_lambda,
			),
			seq(
				//optional($.typeArguments),
				$.valueArguments
			)
		)),

		annotated_lambda: $ => seq(
			optional(seq(
				choice(
					$._annotations,
					$.label,
				),
				optional($.NLS),
			)),
			$.lambda_literal
		),

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

		// precedence should be more that for unaryPrefix
		valueArgument: $ => prec(PREC.VALUE_ARGUMENT, seq(
			optional(seq(
				$.annotation,
				optional($.NLS)
			)),
			optional(seq(
				$.simpleIdentifier,
				//optional($.NLS),
				$.ASSIGNMENT,
				optional($.NLS)
			)),
			optional(seq(
				$.MULT,
				optional($.NLS)
			)),
			$.expression
		)),

		primaryExpression: $ => choice(
			$.parenthesizedExpression,
			$.simpleIdentifier,
			$.literalConstant,
			$.stringLiteral,
			$.callableReference,
			// TODO enable function literal
			//$._function_literal,
			$.object_literal,
			$.collectionLiteral,
			$.thisExpression,
			$.superExpression,
			// TODO enable if_expression
			//$.if_expression,
			$.when_expression,
			$.try_expression,
			//$.jumpExpression was moved to the top, see rightRecursiveExpression rule
		),

		parenthesizedExpression: $ => seq(
			$.LPAREN,
			optional($.NLS),
			$.expression,
			// TODO
			//optional($.NLS),
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
			optional($.NLS ),
			$.expression,
			optional($.NLS),
			"}",
		),

		// precedence should be less that for block
		lambda_literal: $ => prec(PREC.LAMBDA_LITERAL, seq(
			"{",
			optional(seq(
				optional($.NLS),
				optional($.lambda_parameters),
				// TODO
				//optional($.NLS),
				"->",
				optional($.NLS),
			)),
			optional(seq(
				optional($.NLS),
				$.statements,
			)),
			"}",
		)),

		lambda_parameters: $ => sep1(
			$._lambda_parameter,
			seq(
				// TODO
				//optional($.NLS),
				",",
				optional($.NLS),
			)
		),

		_lambda_parameter: $ => choice(
			$.variable_declaration,
			seq(
				$.multi_variable_declaration,
				optional(seq(
					// TODO
					//optional($.NLS),
					$.COLON,
					optional($.NLS),
					$.type
				))
			)
		),

		anonymous_function: $ => seq(
			"fun",
			optional(seq(
				optional($.NLS),
				// in specification here is
				// type instead of receiverType
				$.receiverTypeWithDot,
			)),
			$.parametersWithOptionalType,
			optional(seq(
				// TODO
				//optional($.NLS),
				$.COLON,
				optional($.NLS),
				$._type,
			)),
			// In specification there are typeConstraints
			// and optional functionBody which do not make sense
			// TODO
			//optional($.NLS),
			$.function_body
		),

		_function_literal: $ => choice(
			$.lambda_literal,
			$.anonymous_function
		),

		object_literal: $ => seq(
			"object",
			// TODO
			//optional($.NLS),
			optional(seq(
				$.COLON,
				optional($.NLS),
				$._delegation_specifiers,
				optional($.NLS),
			)),
			$.class_body
		),

		thisExpression: $ => choice(
			$.THIS,
			$.THIS_AT
		),

		// TODO should use lexer to disable whitespaces and extract '@ident' in 'super<C>@ident' as a token
		superExpression: $ => prec.right(choice(
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

		if_expression: $ => prec.right(seq(
			"if",
			optional($.NLS),
			$.LPAREN,
			optional($.NLS),
			$._expression,
			optional($.NLS),
			$.RPAREN,
			optional($.NLS),
			choice(
				$.control_structure_body,
				";",
				seq(
					optional($.control_structure_body),
					optional($.NLS),
					optional(";"),
					optional($.NLS),
					"else",
					optional($.NLS),
					choice($.control_structure_body, ";")
				)
			)
		)),

		when_subject: $ => seq(
			$.LPAREN,
			optional(seq(
				optional($._annotations),
				optional($.NLS),
				"val",
				optional($.NLS),
				$.variable_declaration,
				optional($.NLS),
				"=",
				optional($.NLS),
			)),
			$._expression,
			$.RPAREN,
		),

		when_expression: $ => seq(
			"when",
			optional($.NLS),
			optional($.when_subject),
			optional($.NLS),
			$.LCURL,
			optional($.NLS),
			repeat(seq(
				$.when_entry,
				// newlines here are already consumed by when_entry
				//optional($.NLS),
			)),
			$.RCURL
		),

		when_entry: $ => seq(
			choice(
				seq(
					$.when_condition,
					repeat(seq(
						optional($.NLS),
						",",
						optional($.NLS),
						$.when_condition
					))),
				"else"
			),
			optional($.NLS),
			"->",
			optional($.NLS),
			$.control_structure_body,
			// TODO semi should be optional
			$.semi,
			//optional($.semi)
		),

		when_condition: $ => choice(
			$._expression,
			$.range_test,
			$.type_test
		),

		range_test: $ => seq(
			$.inOperator,
			optional($.NLS),
			$._expression
		),

		type_test: $ => seq(
			$.isOperator,
			optional($.NLS),
			$._expression
		),

		// right associativity is here to avoid parsing consequent 'catch' as infix call
		// Specification parser here differs from compiler
		try_expression: $ => prec.right(seq(
			"try",
			optional($.NLS),
			$.block,
			choice(
				seq(
					repeat1(seq(
						// TODO
						//optional($.NLS),
						$.catch_block
					)),
					optional(seq(
						//optional($.NLS),
						$.finally_block
					))
				),
				seq(
					//optional($.NLS),
					$.finally_block
				)
			)
		)),

		catch_block: $ => seq(
			"catch",
			optional($.NLS),
			$.LPAREN,
			repeat($.annotation),
			$.simple_identifier,
			$.COLON,
			$._type,
			$.RPAREN,
			optional($.NLS),
			$.block,
		),

		finally_block: $ => seq(
			"finally",
			optional($.NLS),
			$.block
		),

		// right precedence here is to avoid parsing
		// 'val x = 4 get() = field' without line break before getter
		jumpExpression: $ => prec.right(choice(
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
		)),

		callableReference: $ => seq(
			choice(
				seq(
					optional($.receiverType),
					// TODO
					//optional($.NLS),
					$.COLONCOLON,
				),
				seq(
					$.parenthesizedType,
					//optional($.NLS),
					$.nullableCallable,
				),
				seq(
					$.typeReference,
					//optional($.NLS),
					$.nullableCallable,
				),
			),
			optional($.NLS),
			choice(
				$.simpleIdentifier,
				$.CLASS,
			)
		),

		assignmentAndOperator: $ => choice(
			"+=",
			"-=",
			"*=",
			"/=",
			"%="
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

		safeNav: $ => seq($.QUEST_NO_WS, $.DOT),

		// ==========
		// Modifiers
		// ==========

		// TODO do really all modifier lists should have right associativity?
		modifiers: $ => prec.right(repeat1(choice(
			$.annotation,
			$._modifier
		))),

		parameter_modifiers: $ => prec.right(repeat1(choice(
			$.annotation,
			$.parameter_modifier
		))),

		_modifier: $ => seq(
			choice(
				$.class_modifier,
				$.member_modifier,
				$.visibility_modifier,
				$.function_modifier,
				$.property_modifier,
				$.inheritance_modifier,
				$.parameter_modifier,
				$.platform_modifier
			),
			// TODO
			//optional($.NLS)
		),

		// right precedence here avoids parsing
		// 'val x: @A suspend' as property with name 'suspend'
		typeModifiers: $ => prec.right(repeat1($.typeModifier)),

		typeModifier: $ => choice(
			$.annotation,
			seq(
				$.SUSPEND,
				// TODO
				// optional($.NLS),
			)
		),

		class_modifier: $ => choice(
			$.ENUM,
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

		varianceModifier: $ => choice(
			$.IN,
			$.OUT
		),

		// TODO
		//  right associativity here break parsing mysterious code like 'inline fun <@A reified reified> f() {}'
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
			$.EXTERNAL,
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

		reification_modifier: $ => $.REIFIED,

		platform_modifier: $ => choice(
			$.EXPECT,
			$.ACTUAL
		),

        // ==========
		// Annotations
		// ==========

        // extracted for referencing from conflict list
		_annotations: $ => repeat1($.annotation),

		annotation: $ => seq(
			choice(
				$.singleAnnotation,
				$.multiAnnotation
			),
			// TODO
			//optional($.NLS)
		),

		singleAnnotation: $ => choice(
			seq(
				$.annotationUseSiteTarget,
				optional($.NLS),
				$.unescaped_annotation
			),
			seq(
				choice(
					$.AT_NO_WS,
					$.AT_PRE_WS
				),
				$.unescaped_annotation
			)
		),

		multiAnnotation: $ => choice(
			seq(
				$.annotationUseSiteTarget,
				optional($.NLS),
				$.LSQUARE,
				repeat1($.unescaped_annotation),
				$.RSQUARE
			),
			seq(
				choice(
					$.AT_NO_WS,
					$.AT_PRE_WS
				),
				$.LSQUARE,
				repeat1($.unescaped_annotation),
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

		// right associativity is here to make annotations
		// starting with '@Ann(...' always be resolved as constructor call
		unescaped_annotation: $ => prec.right(choice(
			$.constructor_invocation,
			$.userType
		)),

		// ==========
		// Identifiers
		// ==========

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

		identifier: $ => sep1(
			$.simple_identifier,
			seq(
				// TODO
				//optional($.NLS),
				$.DOT
			)
		),

		// ==========
		// Conversions due to mess with naming conventions
		// ==========

		_expression: $ => $.expression,
		value_arguments: $ => $.valueArguments,
		simple_identifier: $ => $.simpleIdentifier,
		_type: $ => $.type,
		user_type: $ => $.userType,
		function_type: $ => $.functionType,

		//-------------
		// Lexical rules
		//-------------

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

		// TODO: review tokens containing whitespaces/comments inside
		// due to tree-sitter's context lexing tricks with *_NO_WS do not work
		WS: $ => /[\u0020\u0009\u000C]+/,

		// TODO combining multiple newlines into single token
		//  misses comments inside newline characters
		NLS: $ => /(\n|\r\n?)+/,

		// TODO nested block comments
		// TODO comments should not eat any newline symbols
		Hidden: $ => token(choice(
			seq(
				/\/\*([^*]|\*[^/])*\*\//
			),
			token(seq(
				/\/\/[^\n]*(\n|\r\n?)?/,
			)),
			//token(/[\u0020\u0009\u000C]+/)
		)),

		//--------------
		// Symbols
		//--------------

		DOT: $ => token("."),

		NLSDOT: $ => seq(prec.right(repeat(/(\n|\r\n?)/)), "."),

		COMMA: $ => token(","),

		LPAREN: $ => token("("),

		RPAREN: $ => token(")"),

		LSQUARE: $ => token("["),

		RSQUARE: $ => token("]"),

		LCURL: $ => token("{"),

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

		EXCL_NO_WS: $ => token("!"),

		COLON: $ => token(":"),

		ASSIGNMENT: $ => token("="),

		ARROW: $ => token("->"),

		RANGE: $ => token(".."),

		COLONCOLON: $ => token("::"),

		AT_NO_WS: $ => token("@"),

		QUEST_NO_WS: $ => "?",

		NLSQUEST: $ => /(\n|\r\n)*\?/,

		LANGLE: $ => token("<"),

		RANGLE: $ => token(">"),

		LE: $ => token("<="),

		GE: $ => token(">="),

		EXCL_EQ: $ => token("!="),

		EXCL_EQEQ: $ => token("!=="),

		AS_SAFE: $ => token("as?"),

		EQEQ: $ => token("=="),

		EQEQEQ: $ => token("==="),

		//---------------
		// Tokens containing identifier
		//---------------

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

		//---------------
		// Symbols consuming whitespaces
		//---------------


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

		//---------------
		// Keywords
		//---------------

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

		//--------------
		// Literals and identifiers
		//--------------

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

	}
});

function sep1(rule, separator) {
	return seq(rule, repeat(seq(separator, rule)));
}
